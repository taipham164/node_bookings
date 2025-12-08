import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateWorkingHoursDto {
  @IsString()
  @IsNotEmpty()
  shopId!: string;

  @IsString()
  @IsNotEmpty()
  barberId!: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number; // 0 = Sunday, 1 = Monday, ... 6 = Saturday

  @IsString()
  @IsNotEmpty()
  startTime!: string; // "HH:mm" format

  @IsString()
  @IsNotEmpty()
  endTime!: string; // "HH:mm" format
}
