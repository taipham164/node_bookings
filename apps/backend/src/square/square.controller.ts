import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { SquareService } from './square.service';

interface SyncServicesResponse {
  success: boolean;
  message: string;
  data: {
    created: number;
    updated: number;
    skipped: number;
    total: number;
    errors: string[];
  };
}

interface SyncBarbersResponse {
  success: boolean;
  message: string;
  data: {
    created: number;
    updated: number;
    skipped: number;
    total: number;
    errors: string[];
  };
}

@Controller('integrations/square')
export class SquareController {
  private readonly logger = new Logger(SquareController.name);

  constructor(private readonly squareService: SquareService) {}

  @Post('sync-services')
  @HttpCode(HttpStatus.OK)
  async syncServices(): Promise<SyncServicesResponse> {
    this.logger.log('Starting Square services sync...');
    
    try {
      const result = await this.squareService.syncServicesToDb();
      
      const message = `Sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`;
      
      this.logger.log(message);
      
      return {
        success: true,
        message,
        data: result,
      };
    } catch (error) {
      this.logger.error('Square services sync failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: `Sync failed: ${errorMessage}`,
        data: {
          created: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          errors: [errorMessage],
        },
      };
    }
  }

  @Post('sync-barbers')
  @HttpCode(HttpStatus.OK)
  async syncBarbers(): Promise<SyncBarbersResponse> {
    this.logger.log('Starting Square barbers sync...');
    
    try {
      const result = await this.squareService.syncBarbersToDb();
      
      const message = `Barber sync completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`;
      
      this.logger.log(message);
      
      return {
        success: true,
        message,
        data: result,
      };
    } catch (error) {
      this.logger.error('Square barbers sync failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        success: false,
        message: `Barber sync failed: ${errorMessage}`,
        data: {
          created: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          errors: [errorMessage],
        },
      };
    }
  }
}
