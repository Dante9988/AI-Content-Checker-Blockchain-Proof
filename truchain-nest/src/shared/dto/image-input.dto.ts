import { ApiProperty } from '@nestjs/swagger';

export class ImageInputDto {
  @ApiProperty({
    description: 'URL to the image',
    required: false,
    example: 'https://example.com/image.jpg',
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Base64 encoded image data',
    required: false,
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAoHBw...',
  })
  base64?: string;
}
