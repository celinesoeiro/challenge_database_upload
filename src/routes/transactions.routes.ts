import { Router } from 'express';
import { getCustomRepository } from 'typeorm';
import multer from 'multer';

import TransactionsRepository from '../repositories/TransactionsRepository';
import CreateTransactionService from '../services/CreateTransactionService';
import DeleteTransactionService from '../services/DeleteTransactionService';
import ImportTransactionsService from '../services/ImportTransactionsService';

import uploadConfig from '../config/upload';

const transactionsRouter = Router();

const upload = multer(uploadConfig);

transactionsRouter.get('/', async (request, response) => {
  const transactionsRepo = getCustomRepository(TransactionsRepository);

  const transactions = await transactionsRepo.find();
  const balance = await transactionsRepo.getBalance();

  const resp = {
    transactions: transactions,
    balance: balance
  }

  return response.json(resp);
});

transactionsRouter.post('/', async (request, response) => {
  const { title, value, type, category } = request.body;

  const createTransaction = new CreateTransactionService();

  const transation = await createTransaction.execute({
    title,
    value,
    type,
    category
  });

  return response.json(transation);
});

transactionsRouter.delete('/:id', async (request, response) => {
  const { id } = request.params;

  const deleteTransaction = new DeleteTransactionService();

  const message = await deleteTransaction.execute({id});

  return response.json(message);
});

//Multer age como se fosse um middleware
transactionsRouter.post(
  '/import', upload.single('file'), async (request, response) => {
    const importTransaction = new ImportTransactionsService();

    const transactions = await importTransaction.execute(request.file.path);

    return response.json(transactions);
});

export default transactionsRouter;
