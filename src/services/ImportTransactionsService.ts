import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, In, getCustomRepository } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVResponse {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute( filePath : string ): Promise<Transaction[]> {
    // Lendo o arquivo
    const readCSVStream = fs.createReadStream(filePath);

    const parseStream = csvParse({
      from_line: 2,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVResponse[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell : string) =>
        cell.trim()
      );

      if (title === undefined || type === undefined || value === undefined) return;

      transactions.push({
        title,
        type,
        value,
        category
      });
      categories.push(category);

    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    // Verificando a existencia das categorias e cadastrando no db
    const categoryRepo = getRepository(Category);

    const checkExistingCategories = await categoryRepo.find({
      where: {title: In(categories)}
    });

    const existingCategoriesTitle = checkExistingCategories.map(
      (category : Category ) => category.title
    );

    const newCategories = categories
    .filter(category => !existingCategoriesTitle.includes(category))
    .filter((value, index, self) => self.indexOf(value) === index);

    const addCategories = categoryRepo.create(
      newCategories.map(category => ({
        title: category
      }))
    )
    await categoryRepo.save(addCategories);

    const allCategories = [...newCategories, ...checkExistingCategories] as Category[];

    // Adicionando as transações no db
    const transactionsRepo = getCustomRepository(TransactionsRepository);

    function getCategoryId(transaction: CSVResponse){
      let id = '';
      allCategories.map( category => {
        if (category.title === transaction.category){
          id = category.id;
        }
      })

      return id;
    }

    const newTransactions = transactionsRepo.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category: allCategories.find(
          category => category.title === transaction.category
        ),
        // category_id: getCategoryId(transaction),
      })),
    )

    await transactionsRepo.save(newTransactions);

    await fs.promises.unlink(filePath);

    return newTransactions;
  }

}

export default ImportTransactionsService;
