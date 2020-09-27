import AppError from '../errors/AppError';
import { getRepository, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string
}

class CreateTransactionService {
  public async execute({ title, value, type, category }: Request): Promise<Transaction> {
    const transactionRepo = getRepository(Transaction);

    const categoryRepo = getRepository(Category);

    const transactionsRepo = getCustomRepository(TransactionsRepository);

    // Checking if balance > value
    const balance = await transactionsRepo.getBalance();
    if (balance.total < value){
      throw new AppError("Ops! You can't afford that.", 400);
    }

    // Checking if new category already exists
    const checkExistingCategory = await categoryRepo.findOne({ where: { 'title': category } });

    if (checkExistingCategory){
      const transaction = transactionRepo.create({
        title,
        value,
        type,
        category_id: checkExistingCategory.id,
      });

      await transactionRepo.save(transaction);

      return transaction;

    } else {
      const newCategory = categoryRepo.create({
        title: category,
      });
      await categoryRepo.save(newCategory);

      const transaction = transactionRepo.create({
        title,
        value,
        type,
        category_id: newCategory.id
      });

      await transactionRepo.save(transaction);

      return transaction;
    }
  }
}

export default CreateTransactionService;
