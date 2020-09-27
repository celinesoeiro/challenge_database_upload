import AppError from '../errors/AppError';
import { getRepository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Request {
  id: string
}

interface Response {
  message: string
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<Response> {
    // Checar se existe a transação. Se existir, deleta. Se não existir, error.
    const transactionRepo = getRepository(Transaction);

    const checkExistingTransaction = await transactionRepo.findOne({ where: {id} });

    if (checkExistingTransaction){
      await transactionRepo.delete(id);

      throw new AppError('',204)
    } else {
      throw new AppError('This transaction does not exist.', 404)
    }
  }
}

export default DeleteTransactionService;
