import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
const currentNodeURL = process.argv[3];

function Blockchain() {
  this.chain = [];
  this.pendingTransactions = [];
  this.currentNodeURL = currentNodeURL;
  this.networkNodes = [];
  this.createNewBlock(
    556231,
    '4458889azxcasd133321as5',
    'asdlkj129asvlnascasasdlj129asjkasfdls'
  );
}

Blockchain.prototype.createNewBlock = function (
  nonce,
  previousBlockHash,
  hash
) {
  const newBlock = {
    index: this.chain.length + 1,
    timestamp: Date.now(),
    transactions: this.pendingTransactions,
    nonce,
    hash,
    previousBlockHash,
  };

  this.pendingTransactions = [];
  this.chain.push(newBlock);

  return newBlock;
};

Blockchain.prototype.getLastBlock = function () {
  return this.chain[this.chain.length - 1];
};

Blockchain.prototype.createNewTransaction = function (
  amount,
  sender,
  recipient
) {
  const newTransaction = {
    transactionId: uuidv4().split('-').join(''),
    amount,
    sender,
    recipient,
  };

  return newTransaction;
};

Blockchain.prototype.addTransactionToPendingList = function (transactionObj) {
  this.pendingTransactions.push(transactionObj);

  return this.getLastBlock()['index'] + 1;
};

Blockchain.prototype.hashBlock = function (
  previouesBlockHash,
  currentBlockData,
  nonce
) {
  const dataAsString =
    previouesBlockHash + nonce.toString() + JSON.stringify(currentBlockData);

  const hash = createHmac('sha256', 'zxlsah29efnkj')
    .update(dataAsString)
    .digest('hex');

  return hash;
};

Blockchain.prototype.proofOfWork = function (
  previusBlockHash,
  currentBlockData
) {
  let nonce = 0;

  let hash = this.hashBlock(previusBlockHash, currentBlockData, nonce);
  while (hash.substring(0, 4) !== '0000') {
    nonce++;
    hash = this.hashBlock(previusBlockHash, currentBlockData, nonce);
  }

  return nonce;
};

Blockchain.prototype.chainIsValid = function (blockchain) {
  let validChain = true;

  for (let i = 1; i < blockchain.length; i++) {
    const currentBlock = blockchain[i];
    const prevBlock = blockchain[i - 1];
    const blockHash = this.hashBlock(
      prevBlock['hash'],
      {
        transactions: currentBlock['transactions'],
        index: currentBlock['index'],
      },
      currentBlock['nonce']
    );

    if (blockHash.substring(0, 4) !== '0000') validChain = false;
    if (currentBlock['previousBlockHash'] !== prevBlock['hash'])
      validChain = false;
  }

  const genesisBlock = blockchain[0];
  const isCorrectNonce = genesisBlock['nonce'] === 556231;
  const isCorrectPrevBlockHash =
    genesisBlock['previousBlockHash'] === '4458889azxcasd133321as5';
  const isCorrectHash =
    genesisBlock['hash'] === 'asdlkj129asvlnascasasdlj129asjkasfdls';
  const isCorrectTransactions = genesisBlock['transactions'].length === 0;

  if (
    !isCorrectHash ||
    !isCorrectNonce ||
    !isCorrectPrevBlockHash ||
    !isCorrectTransactions
  ) {
    console.error('here');
    validChain = false;
  }

  return validChain;
};

Blockchain.prototype.getBlock = function (blockHash) {
  let correctBlock = null;
  this.chain.forEach((block) => {
    if (block.hash === blockHash) {
      correctBlock = block;
    }
  });

  return correctBlock;
};

Blockchain.prototype.getTransaction = function (id) {
  let correctBlock = null;
  let correctTransaction = null;
  this.chain.forEach((block) => {
    block.transactions.forEach((ta) => {
      if (ta.transactionId === id) {
        correctTransaction = ta;
        correctBlock = block;
      }
    });
  });
  return {
    transaction: correctTransaction,
    block: correctBlock,
  };
};

Blockchain.prototype.getAddress = function (address) {
  const addressTransactions = [];

  this.chain.forEach((block) => {
    block.transaction.forEach((ta) => {
      if (ta.sender === address || ta.recipient === address) {
        addressTransactions.push(ta);
      }
    });
  });

  let balance = 0;

  addressTransactions.forEach((ta) => {
    if (transaction.recipient === address) balance += transaction.amount;
    else if (transaction.sender === address) balance -= transaction.amount;
  });
  return {
    addressTransactions,
    balance,
  };
};

export default Blockchain;
