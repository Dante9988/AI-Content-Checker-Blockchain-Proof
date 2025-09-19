import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false
  })
  email?: string;

  @ApiProperty({
    description: 'User password',
    example: 'securePassword123',
    required: false
  })
  password?: string;
}
