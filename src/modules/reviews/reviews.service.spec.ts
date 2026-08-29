import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  it('should return approved, pending and total review counts', async () => {
    const prisma = {
      reviews: {
        findMany: jest.fn().mockResolvedValue([
          { is_published: true },
          { is_published: false },
          { is_published: true },
        ]),
      },
    } as any;

    const service = new ReviewsService(prisma);

    const summary = await service.getApprovalSummary();

    expect(summary).toEqual({
      total: 3,
      approved: 2,
      pending: 1,
    });
  });
});
