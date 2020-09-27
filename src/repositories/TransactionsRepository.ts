import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    // todas as transaçoes
    const transactions = this.find();

    let income = 0;
    let outcome = 0;

    (await transactions).map( transaction => {
      transaction.type === 'income'
      ? income += Number(transaction.value)
      : outcome += Number(transaction.value);
    });

    let total = income - outcome;

    let balance = {
      'income': income,
      'outcome': outcome,
      'total': total,
    }

    return balance;
  }
}

export default TransactionsRepository;

/**
 * Retornar:
 *  'transactions': Todas as transações
 *  'balance':
 *    'income': Soma das entradas
 *    'outcome': soma das retiradas
 *    'total': total de créditos
 */
