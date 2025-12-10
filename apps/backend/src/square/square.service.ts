import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Client, Environment, CatalogObject } from 'square';
import { safeNumberConversion, monetaryAmountToCents, durationMsToMinutes } from '../util/bigint-helpers';

interface SquareServiceItem {
  id: string;
  name: string;
  durationMins: number;
  priceCents: number;
  squareItemId: string;
  description?: string;
  variations: {
    id: string;
    name: string;
    priceCents: number;
    availableForBooking: boolean;
  }[];
}

interface SyncResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
}

interface SquareTeamMember {
  id: string;
  givenName?: string;
  familyName?: string;
  displayName?: string;
  emailAddress?: string;
  phoneNumber?: string;
  status: string;
}

interface BarberSyncResult {
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: string[];
}

@Injectable()
export class SquareService {
  private readonly logger = new Logger(SquareService.name);
  private readonly squareClient: Client;
  private readonly locationId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {
    const accessToken = this.configService.get<string>('SQUARE_ACCESS_TOKEN');
    const environment = this.configService.get<string>('SQUARE_ENVIRONMENT', 'sandbox');
    const locationId = this.configService.get<string>('SQUARE_LOCATION_ID');
    
    if (!locationId) {
      throw new Error('SQUARE_LOCATION_ID is required');
    }
    this.locationId = locationId;

    if (!accessToken) {
      throw new Error('SQUARE_ACCESS_TOKEN is required');
    }

    const squareEnvironment = environment.toLowerCase() === 'production' 
      ? Environment.Production 
      : Environment.Sandbox;

    this.squareClient = new Client({
      accessToken,
      environment: squareEnvironment,
      userAgentDetail: 'tyler_platform_nestjs'
    });

    this.logger.log(`Square client initialized for ${environment} environment`);
  }

  /**
   * Fetch all APPOINTMENTS_SERVICE items from Square Catalog
   */
  async fetchServicesFromSquare(): Promise<SquareServiceItem[]> {
    try {
      this.logger.log('Fetching services from Square Catalog...');
      
      const { result } = await this.squareClient.catalogApi.listCatalog();
      const objects = result.objects || [];

      // Filter for APPOINTMENTS_SERVICE items that are not deleted
      const serviceItems = objects.filter((obj: CatalogObject) => {
        if (obj.type !== 'ITEM' || !obj.itemData || obj.isDeleted) {
          return false;
        }
        
        const itemData = obj.itemData as any;
        return itemData.productType === 'APPOINTMENTS_SERVICE';
      });

      this.logger.log(`Found ${serviceItems.length} service items in Square Catalog`);

      // Transform Square items to our format
      const services: SquareServiceItem[] = [];
      
      for (const item of serviceItems) {
        const itemData = item.itemData as any;
        const variations = itemData.variations || [];
        
        // Only include items that have at least one bookable variation
        const bookableVariations = variations.filter((variation: any) => 
          variation.itemVariationData?.availableForBooking === true
        );
        
        if (bookableVariations.length === 0) {
          continue;
        }

        // Get the primary variation for basic info
        const primaryVariation = bookableVariations[0];
        const variationData = primaryVariation.itemVariationData;
        
        if (!variationData) continue;

        // Extract duration from service duration or default to 60 minutes
        const durationMins = durationMsToMinutes(variationData.serviceDuration);

        // Extract price in cents using safe BigInt conversion
        const priceCents = monetaryAmountToCents(variationData.priceMoney?.amount);

        services.push({
          id: item.id!,
          name: itemData.name || 'Unnamed Service',
          durationMins,
          priceCents,
          squareItemId: item.id!,
          description: itemData.description,
          variations: bookableVariations.map((variation: any) => ({
            id: variation.id!,
            name: variation.itemVariationData?.name || itemData.name || 'Unnamed Variation',
            priceCents: monetaryAmountToCents(variation.itemVariationData?.priceMoney?.amount),
            availableForBooking: variation.itemVariationData?.availableForBooking || false,
          })),
        });
      }

      this.logger.log(`Processed ${services.length} bookable services`);
      return services;
    } catch (error) {
      this.logger.error('Failed to fetch services from Square:', error);
      throw new BadRequestException('Failed to fetch services from Square Catalog');
    }
  }

  /**
   * Fetch all active team members from Square
   */
  async fetchBarbersFromSquare(): Promise<SquareTeamMember[]> {
    try {
      this.logger.log('Fetching team members from Square...');
      
      const { result } = await this.squareClient.teamApi.searchTeamMembers({
        query: {
          filter: {
            locationIds: [this.locationId],
            status: 'ACTIVE'
          }
        }
      });

      const teamMembers = result.teamMembers || [];
      this.logger.log(`Found ${teamMembers.length} active team members in Square`);

      // Transform Square team members to our format
      const barbers: SquareTeamMember[] = teamMembers.map((member: any) => ({
        id: member.id!,
        givenName: member.givenName,
        familyName: member.familyName,
        displayName: member.givenName && member.familyName 
          ? `${member.givenName} ${member.familyName}`.trim()
          : member.givenName || member.familyName || `Team Member ${member.id}`,
        emailAddress: member.emailAddress,
        phoneNumber: member.phoneNumber,
        status: member.status,
      }));

      this.logger.log(`Processed ${barbers.length} team members for sync`);
      return barbers;
    } catch (error) {
      this.logger.error('Failed to fetch team members from Square:', error);
      throw new BadRequestException('Failed to fetch team members from Square');
    }
  }

  /**
   * Sync team members from Square to the database as barbers
   */
  async syncBarbersToDb(): Promise<BarberSyncResult> {
    const result: BarberSyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      errors: [],
    };

    try {
      // Find the shop that matches our Square location
      let shop = await this.prismaService.shop.findFirst({
        where: { squareLocationId: this.locationId },
      });

      if (!shop) {
        // Fallback: use the first available shop
        shop = await this.prismaService.shop.findFirst();
        
        if (!shop) {
          throw new Error('No shop found in database. Please create a shop first.');
        }
        
        this.logger.warn(
          `No shop found with Square location ID ${this.locationId}. Using shop: ${shop.name}`
        );
      }

      const squareBarbers = await this.fetchBarbersFromSquare();
      result.total = squareBarbers.length;

      this.logger.log(`Syncing ${squareBarbers.length} team members to barbers table...`);

      for (const squareBarber of squareBarbers) {
        try {
          // Check if barber already exists by squareTeamMemberId and shopId
          const existingBarber = await this.prismaService.barber.findFirst({
            where: {
              squareTeamMemberId: squareBarber.id,
              shopId: shop.id,
            },
          });

          if (existingBarber) {
            // Update existing barber
            await this.prismaService.barber.update({
              where: { id: existingBarber.id },
              data: {
                displayName: squareBarber.displayName!,
                active: squareBarber.status === 'ACTIVE',
                updatedAt: new Date(),
              },
            });
            result.updated++;
            this.logger.debug(`Updated barber: ${squareBarber.displayName}`);
          } else {
            // Create new barber
            await this.prismaService.barber.create({
              data: {
                displayName: squareBarber.displayName!,
                squareTeamMemberId: squareBarber.id,
                active: squareBarber.status === 'ACTIVE',
                shopId: shop.id,
              },
            });
            result.created++;
            this.logger.debug(`Created barber: ${squareBarber.displayName}`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync barber ${squareBarber.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
          result.skipped++;
        }
      }

      this.logger.log(
        `Barber sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to sync barbers:', error);
      throw new BadRequestException(`Failed to sync barbers: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync services from Square to the database
   */
  async syncServicesToDb(): Promise<SyncResult> {
    const result: SyncResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      total: 0,
      errors: [],
    };

    try {
      // First, we need to find a shop that matches our Square location
      // For now, we'll try to find by squareLocationId or use the first shop
      let shop = await this.prismaService.shop.findFirst({
        where: { squareLocationId: this.locationId },
      });

      if (!shop) {
        // Fallback: use the first available shop
        shop = await this.prismaService.shop.findFirst();
        
        if (!shop) {
          throw new Error('No shop found in database. Please create a shop first.');
        }
        
        this.logger.warn(
          `No shop found with Square location ID ${this.locationId}. Using shop: ${shop.name}`
        );
      }

      const squareServices = await this.fetchServicesFromSquare();
      result.total = squareServices.length;

      this.logger.log(`Syncing ${squareServices.length} services to database...`);

      for (const squareService of squareServices) {
        try {
          // Check if service already exists by squareItemId
          const existingService = await this.prismaService.service.findFirst({
            where: {
              squareItemId: squareService.squareItemId,
              shopId: shop.id,
            },
          });

          if (existingService) {
            // Update existing service
            await this.prismaService.service.update({
              where: { id: existingService.id },
              data: {
                name: squareService.name,
                durationMins: squareService.durationMins,
                priceCents: squareService.priceCents,
                updatedAt: new Date(),
              },
            });
            result.updated++;
            this.logger.debug(`Updated service: ${squareService.name}`);
          } else {
            // Create new service
            await this.prismaService.service.create({
              data: {
                name: squareService.name,
                durationMins: squareService.durationMins,
                priceCents: squareService.priceCents,
                squareItemId: squareService.squareItemId,
                shopId: shop.id,
              },
            });
            result.created++;
            this.logger.debug(`Created service: ${squareService.name}`);
          }
        } catch (error) {
          const errorMsg = `Failed to sync service ${squareService.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
          result.skipped++;
        }
      }

      this.logger.log(
        `Sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`
      );
      
      return result;
    } catch (error) {
      this.logger.error('Failed to sync services:', error);
      throw new BadRequestException(`Failed to sync services: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search availability using Square Bookings API
   */
  async searchAvailability(options: {
    locationId: string;
    serviceVariationId: string;
    teamMemberId?: string;
    date: string; // YYYY-MM-DD
  }): Promise<any[]> {
    try {
      this.logger.log(`Searching availability for service ${options.serviceVariationId} on ${options.date}`);
      
      // Create date range for the specified date
      const startDate = new Date(`${options.date}T00:00:00.000Z`);
      const endDate = new Date(`${options.date}T23:59:59.999Z`);
      
      // Build segment filter
      const segmentFilter: any = {
        serviceVariationId: options.serviceVariationId,
      };
      
      // Add team member filter if specified
      if (options.teamMemberId) {
        segmentFilter.teamMemberIdFilter = {
          any: [options.teamMemberId],
        };
      }
      
      // Build search request
      const searchRequest = {
        query: {
          filter: {
            locationId: options.locationId,
            segmentFilters: [segmentFilter],
            startAtRange: {
              startAt: startDate.toISOString(),
              endAt: endDate.toISOString(),
            },
          },
        },
      };
      
      this.logger.debug('Square availability search request:', JSON.stringify(searchRequest, null, 2));
      
      // Call Square API with pagination
      let allAvailabilities: any[] = [];
      let cursor: string | undefined = undefined;
      let pageCount = 0;
      const maxPages = 10; // Prevent infinite loops
      
      do {
        pageCount++;
        const requestWithCursor = cursor ? { ...searchRequest, cursor } : searchRequest;
        
        try {
          const { result } = await this.squareClient.bookingsApi.searchAvailability(requestWithCursor);
          
          if (result.availabilities && result.availabilities.length > 0) {
            allAvailabilities = allAvailabilities.concat(result.availabilities);
            this.logger.debug(`Page ${pageCount}: Found ${result.availabilities.length} slots, total: ${allAvailabilities.length}`);
          }
          
          cursor = (result as any).cursor;
          
          // Break if no more results or reached max pages
          if (!result.availabilities || result.availabilities.length === 0 || pageCount >= maxPages) {
            break;
          }
        } catch (pageError) {
          this.logger.error(`Error fetching availability page ${pageCount}:`, pageError);
          break;
        }
      } while (cursor);
      
      this.logger.log(`Found ${allAvailabilities.length} total availability slots`);
      return allAvailabilities;
    } catch (error) {
      this.logger.error('Failed to search availability from Square:', error);
      throw new BadRequestException('Failed to search availability from Square');
    }
  }

  /**
   * Get Square client for advanced usage
   */
  getSquareClient(): Client {
    return this.squareClient;
  }

  /**
   * Get configured location ID
   */
  getLocationId(): string {
    return this.locationId;
  }

  /**
   * Charge a no-show fee to a customer
   * @param params - Payment parameters
   * @returns Payment result with Square payment ID, or null if unable to charge
   *
   * TODO: This is a placeholder implementation. Real card-on-file charging requires:
   * 1. Customer to have a saved card on file with Square
   * 2. Card vaulting/tokenization flow
   * 3. Payment source ID (card ID) associated with the customer
   *
   * For now, this method logs the attempt and returns null.
   * When implementing, use Square Payments API with the customer's card on file:
   * - squareClient.paymentsApi.createPayment({
   *     sourceId: <card_id_from_customer_profile>,
   *     customerId: params.customerSquareId,
   *     locationId: params.shopSquareLocationId,
   *     amountMoney: { amount: params.amountCents, currency: params.currency }
   *   })
   */
  async chargeNoShowFee(params: {
    amountCents: number;
    currency: string;
    customerSquareId: string;
    shopSquareLocationId: string;
  }): Promise<{ squarePaymentId: string } | null> {
    this.logger.log(
      `TODO: Charge no-show fee of ${params.amountCents} ${params.currency} to customer ${params.customerSquareId}`,
    );

    // TODO: Implement card-on-file charging flow
    // 1. Retrieve customer's default payment method from Square
    // 2. Create payment using Square Payments API
    // 3. Return the payment ID on success

    // Example implementation (commented out until card-on-file is set up):
    /*
    try {
      const { result } = await this.squareClient.paymentsApi.createPayment({
        sourceId: '<CARD_ID>', // TODO: Get from customer's saved cards
        customerId: params.customerSquareId,
        locationId: params.shopSquareLocationId,
        amountMoney: {
          amount: BigInt(params.amountCents),
          currency: params.currency,
        },
        idempotencyKey: uuidv4(), // Ensure unique payment
      });

      if (result.payment?.id) {
        this.logger.log(`Successfully charged no-show fee. Payment ID: ${result.payment.id}`);
        return { squarePaymentId: result.payment.id };
      }
    } catch (error) {
      this.logger.error('Failed to charge no-show fee via Square:', error);
      throw error;
    }
    */

    this.logger.warn(
      'No-show fee charging not implemented yet - card-on-file integration required',
    );
    return null;
  }

  /**
   * Find or create a customer in Square
   */
  async findOrCreateSquareCustomer(options: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    existingSquareCustomerId?: string;
  }): Promise<string> {
    try {
      // If we already have a Square customer ID, verify it exists
      if (options.existingSquareCustomerId) {
        try {
          const { result } = await this.squareClient.customersApi.retrieveCustomer(
            options.existingSquareCustomerId
          );
          if (result.customer) {
            this.logger.log(`Found existing Square customer: ${options.existingSquareCustomerId}`);
            return options.existingSquareCustomerId;
          }
        } catch (error) {
          this.logger.warn(`Square customer ${options.existingSquareCustomerId} not found, creating new one`);
        }
      }

      // Search for existing customer by phone or email
      const searchQuery: any = {};
      if (options.phone) {
        searchQuery.phoneNumber = { exact: options.phone };
      } else if (options.email) {
        searchQuery.emailAddress = { exact: options.email };
      }

      if (Object.keys(searchQuery).length > 0) {
        try {
          const { result } = await this.squareClient.customersApi.searchCustomers({
            query: {
              filter: searchQuery,
            },
            limit: BigInt(1),
          });

          if (result.customers && result.customers.length > 0) {
            const existingCustomer = result.customers[0];
            this.logger.log(`Found existing Square customer by search: ${existingCustomer.id}`);
            return existingCustomer.id!;
          }
        } catch (error) {
          this.logger.warn('Customer search failed, will create new customer:', error);
        }
      }

      // Create new customer
      this.logger.log(`Creating new Square customer: ${options.firstName} ${options.lastName}`);
      const { result } = await this.squareClient.customersApi.createCustomer({
        givenName: options.firstName,
        familyName: options.lastName,
        phoneNumber: options.phone,
        emailAddress: options.email,
      });

      if (!result.customer?.id) {
        throw new Error('Failed to create Square customer: no customer ID returned');
      }

      this.logger.log(`Created Square customer: ${result.customer.id}`);
      return result.customer.id;
    } catch (error) {
      this.logger.error('Failed to find or create Square customer:', error);
      throw new BadRequestException(
        `Failed to find or create Square customer: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create a booking in Square
   */
  async createSquareBooking(options: {
    locationId: string;
    customerId: string;
    serviceVariationId: string;
    teamMemberId?: string;
    startAt: string; // ISO datetime string
  }): Promise<{
    bookingId: string;
    booking: any;
  }> {
    try {
      this.logger.log(`Creating Square booking for customer ${options.customerId} at ${options.startAt}`);

      // Build appointment segments
      const appointmentSegments: any[] = [
        {
          serviceVariationId: options.serviceVariationId,
          serviceVariationVersion: BigInt(0), // Use latest version
        },
      ];

      // Add team member if specified
      if (options.teamMemberId) {
        appointmentSegments[0].teamMemberId = options.teamMemberId;
      }

      // Create booking request
      const createBookingRequest = {
        booking: {
          locationId: options.locationId,
          customerId: options.customerId,
          startAt: options.startAt,
          appointmentSegments,
        },
      };

      this.logger.debug('Square booking request:', JSON.stringify(createBookingRequest, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      , 2));

      // Call Square API
      const { result } = await this.squareClient.bookingsApi.createBooking(createBookingRequest);

      if (!result.booking?.id) {
        throw new Error('Failed to create Square booking: no booking ID returned');
      }

      this.logger.log(`Created Square booking: ${result.booking.id}`);
      return {
        bookingId: result.booking.id,
        booking: result.booking,
      };
    } catch (error) {
      this.logger.error('Failed to create Square booking:', error);

      // Extract more detailed error info if available
      let errorMessage = 'Failed to create Square booking';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }

      // Check for Square API specific errors
      if (typeof error === 'object' && error !== null && 'errors' in error) {
        const squareErrors = (error as any).errors;
        if (Array.isArray(squareErrors) && squareErrors.length > 0) {
          errorMessage += ` - ${squareErrors.map((e: any) => e.detail || e.code).join(', ')}`;
        }
      }

      throw new BadRequestException(errorMessage);
    }
  }

  /**
   * Verifies if a specific time slot is available in Square
   * @returns true if the slot is available, false otherwise
   */
  async verifySlotIsAvailable(options: {
    locationId: string;
    serviceVariationId: string;
    teamMemberId?: string;
    startAt: string; // ISO 8601 format
  }): Promise<boolean> {
    try {
      this.logger.log(`Verifying slot availability for ${options.startAt}`);

      // Extract the date from the ISO string (YYYY-MM-DD)
      const startAtDate = new Date(options.startAt);
      const dateStr = startAtDate.toISOString().split('T')[0];

      // Search for availability on the specific date
      const availabilities = await this.searchAvailability({
        locationId: options.locationId,
        serviceVariationId: options.serviceVariationId,
        teamMemberId: options.teamMemberId,
        date: dateStr,
      });

      // Check if any of the returned slots match our requested start time
      const requestedStartTime = new Date(options.startAt).toISOString();

      const matchingSlot = availabilities.find((availability: any) => {
        const slotStartTime = availability.startAt;
        return slotStartTime === requestedStartTime;
      });

      if (matchingSlot) {
        this.logger.log(`Slot verified as available at ${requestedStartTime}`);
        return true;
      }

      this.logger.warn(`Slot not available at ${requestedStartTime}`);
      return false;
    } catch (error) {
      this.logger.error('Failed to verify slot availability:', error);
      // If we can't verify with Square, we'll allow it to proceed
      // This prevents Square API issues from blocking bookings
      this.logger.warn('Allowing booking to proceed despite Square verification failure');
      return true;
    }
  }
}
