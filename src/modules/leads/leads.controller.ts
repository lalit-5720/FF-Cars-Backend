import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { Prisma } from '@prisma/client';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('interestLevel') interestLevel?: string,
    @Query('source') source?: string,
  ) {
    return this.leadsService.findAll({ status, interestLevel, source });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.findOne(id);
  }

  @Post()
  create(@Body() data: Prisma.leadsCreateInput) {
    return this.leadsService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Prisma.leadsUpdateInput,
  ) {
    return this.leadsService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.leadsService.remove(id);
  }
}
