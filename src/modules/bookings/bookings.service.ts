import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Car, Booking, Role, CarStatus, BookingStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
  ) {}

  // Active listener hooks or callbacks to trigger real-time updates without circular import issues
  private onBookingCreatedCallback: (booking: any, car: Car) => void = () => {};
  private onBookingCancelledCallback: (booking: any, car: Car) => void = () => {};
  private onBookingConfirmedCallback: (booking: any, car: Car) => void = () => {};

  registerCallbacks(
    onCreated: (b: any, c: Car) => void,
    onCancelled: (b: any, c: Car) => void,
    onConfirmed: (b: any, c: Car) => void,
  ) {
    this.onBookingCreatedCallback = onCreated;
    this.onBookingCancelledCallback = onCancelled;
    this.onBookingConfirmedCallback = onConfirmed;
  }

  async createBooking(userId: string, createBookingDto: CreateBookingDto): Promise<Booking> {
    const { carId } = createBookingDto;

    // Use Prisma interactive transactions
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Lock the car row using FOR UPDATE raw SQL query
      // This forces concurrent requests for the same car to queue sequentially.
      const cars = await tx.$queryRaw<Car[]>`
        SELECT * FROM cars WHERE id = ${carId} FOR UPDATE
      `;
      
      if (!cars || cars.length === 0) {
        throw new NotFoundException(`Car with ID ${carId} not found`);
      }
      
      const car = cars[0];

      // 2. Verify availability
      if (car.status !== CarStatus.AVAILABLE) {
        throw new BadRequestException('Car is already booked or unavailable');
      }

      const user = await.tx.User.findUnique({
        where:{id:id}
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // 3. Create the booking record
      const booking = await tx.booking.create({
        data: {
          userId,
          username : user.name,
          carId,
          bookingStatus: BookingStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          bookingAmount: car.price,
        },
      });

      // 4. Keep the car status as AVAILABLE so others can request a test ride.
      // (No status update here. The status remains AVAILABLE until admin confirms payment).
      return { booking, car };
    });

    // 5. Trigger the callback (which will broadcast via Socket.IO in the notifications module)
    if (result && result.booking) {
      this.onBookingCreatedCallback(result.booking, result.car);
    }

    return result.booking;
  }

  async findAll(userId: string, role: Role, allBookings = false): Promise<any[]> {
    if (allBookings && role === Role.ADMIN) {
      return this.prisma.booking.findMany({
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          car: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        car: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: Role): Promise<any> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        car: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    if (role !== Role.ADMIN && booking.userId !== userId) {
      throw new ForbiddenException('You do not have permission to view this booking');
    }

    return booking;
  }

  async cancelBooking(id: string, userId: string, role: Role): Promise<Booking> {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      if (role !== Role.ADMIN && booking.userId !== userId) {
        throw new ForbiddenException('You cannot cancel this booking');
      }

      if (booking.bookingStatus === BookingStatus.CANCELLED) {
        throw new BadRequestException('Booking is already cancelled');
      }

      // Update booking status
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          paymentStatus: booking.paymentStatus === PaymentStatus.PAID ? PaymentStatus.REFUNDED : PaymentStatus.FAILED,
        },
      });

      // Update car status to AVAILABLE
      const updatedCar = await tx.car.update({
        where: { id: booking.carId },
        data: { status: CarStatus.AVAILABLE },
      });

      return { booking: updatedBooking, car: updatedCar };
    });

    if (result && result.booking) {
      this.onBookingCancelledCallback(result.booking, result.car);
    }

    return result.booking;
  }

  async confirmBooking(id: string): Promise<Booking> {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Find the booking with car details
      const booking = await tx.booking.findUnique({
        where: { id },
        include: { car: true },
      });

      if (!booking) {
        throw new NotFoundException(`Booking with ID ${id} not found`);
      }

      if (booking.bookingStatus !== BookingStatus.PENDING) {
        throw new BadRequestException(`Booking is already ${booking.bookingStatus.toLowerCase()}`);
      }

      if (booking.car.status !== CarStatus.AVAILABLE) {
        throw new BadRequestException('Car is no longer available');
      }

      // 2. Update current booking status to CONFIRMED and payment to PAID
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          bookingStatus: BookingStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // 3. Update the car status to BOOKED (sold out)
      const updatedCar = await tx.car.update({
        where: { id: booking.carId },
        data: { status: CarStatus.BOOKED },
      });

      // 4. Cancel all other pending bookings for the same car
      await tx.booking.updateMany({
        where: {
          carId: booking.carId,
          id: { not: id },
          bookingStatus: BookingStatus.PENDING,
        },
        data: {
          bookingStatus: BookingStatus.CANCELLED,
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      return { booking: updatedBooking, car: updatedCar };
    });

    // 5. Trigger the confirmation callback
    if (result && result.booking) {
      this.onBookingConfirmedCallback(result.booking, result.car);
    }

    return result.booking;
  }
}
