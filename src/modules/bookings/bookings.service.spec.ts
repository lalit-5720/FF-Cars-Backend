import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CarStatus, BookingStatus, PaymentStatus } from '@prisma/client';

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    $queryRaw: jest.fn(),
    booking: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    car: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBooking', () => {
    const userId = 'user-123';
    const carId = 'car-123';
    const mockCar = {
      id: carId,
      brand: 'Hyundai',
      model: 'i20',
      price: 800000,
      status: CarStatus.AVAILABLE,
    };
    const mockBooking = {
      id: 'booking-123',
      userId,
      carId,
      bookingAmount: 800000,
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    };

    it('should successfully request test ride for an available car and NOT update car status', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([mockCar]);
      mockPrismaService.booking.create.mockResolvedValue(mockBooking);

      const result = await service.createBooking(userId, { carId });

      expect(mockPrismaService.$queryRaw).toHaveBeenCalled();
      expect(mockPrismaService.booking.create).toHaveBeenCalledWith({
        data: {
          userId,
          carId,
          bookingStatus: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          bookingAmount: mockCar.price,
        },
      });
      expect(mockPrismaService.car.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException if car does not exist', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await expect(service.createBooking(userId, { carId })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if car is not AVAILABLE', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{ ...mockCar, status: CarStatus.BOOKED }]);

      await expect(service.createBooking(userId, { carId })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('confirmBooking', () => {
    const bookingId = 'booking-123';
    const carId = 'car-123';
    const mockCar = {
      id: carId,
      brand: 'Hyundai',
      model: 'i20',
      price: 800000,
      status: CarStatus.AVAILABLE,
    };
    const mockBooking = {
      id: bookingId,
      userId: 'user-123',
      carId,
      bookingAmount: 800000,
      bookingStatus: BookingStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
      car: mockCar,
    };

    it('should successfully confirm booking, set car to BOOKED, and cancel others', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue({
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
        paymentStatus: PaymentStatus.PAID,
      });
      mockPrismaService.car.update.mockResolvedValue({
        ...mockCar,
        status: CarStatus.BOOKED,
      });
      mockPrismaService.booking.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.confirmBooking(bookingId);

      expect(mockPrismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: bookingId },
        include: { car: true },
      });
      expect(mockPrismaService.booking.update).toHaveBeenCalledWith({
        where: { id: bookingId },
        data: {
          bookingStatus: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });
      expect(mockPrismaService.car.update).toHaveBeenCalledWith({
        where: { id: carId },
        data: { status: CarStatus.BOOKED },
      });
      expect(mockPrismaService.booking.updateMany).toHaveBeenCalledWith({
        where: {
          carId,
          id: { not: bookingId },
          bookingStatus: BookingStatus.PENDING,
        },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });
      expect(result.bookingStatus).toBe(BookingStatus.CONFIRMED);
      expect(result.paymentStatus).toBe(PaymentStatus.PAID);
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.confirmBooking(bookingId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if booking is not pending', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        bookingStatus: BookingStatus.CONFIRMED,
      });

      await expect(service.confirmBooking(bookingId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if car is not AVAILABLE', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        car: { ...mockCar, status: CarStatus.BOOKED },
      });

      await expect(service.confirmBooking(bookingId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
