import csvParse from 'csv-parse';
import fs from 'fs';
import { getRepository, In } from 'typeorm';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

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
      line.map( (cell : string) => {

        let splited = cell.split(';')

        const title = splited[0];
        const type = splited[1] as unknown as CSVResponse['type'];
        const value = splited[2] as unknown as CSVResponse['value'];
        const category = splited[3];

        // Senão tiver essas infos, nao adiciona na table
        if (title === undefined || type === undefined || value === undefined) return;

        transactions.push({
          title,
          type,
          value,
          category
        });
        categories.push(category);
      });

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

    const newCategories = categories.filter(
      category => !existingCategoriesTitle.includes(category)
    ).filter((value, index, self) => self.indexOf(value) === index);

    const addCategories = categoryRepo.create(
      newCategories.map(category => ({
        title: category
      }))
    )
    await categoryRepo.save(addCategories);

    const allCategories = [...newCategories, ...checkExistingCategories] as Category[];

    // Adicionando as transações no db
    const transactionRepo = getRepository(Transaction);

    function getCategoryId(transaction: CSVResponse){
      let id = '';
      allCategories.map( category => {
        if (category.title === transaction.category){
          id = category.id;
        }
      })

      return id;
    }

    const newTransactions = transactionRepo.create(
      transactions.map(transaction => ({
        title: transaction.title,
        value: transaction.value,
        type: transaction.type,
        category_id: getCategoryId(transaction),
      })),
    )

    await transactionRepo.save(newTransactions);

    await fs.promises.unlink(filePath);

    return newTransactions;
  }

}

export default ImportTransactionsService;
