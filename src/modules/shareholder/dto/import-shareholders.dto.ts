import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateShareholderDto } from './create-shareholder.dto';

export class ImportShareholdersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateShareholderDto)
  shareholders: CreateShareholderDto[];
}