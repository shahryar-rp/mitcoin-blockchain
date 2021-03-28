import express from 'express';
import helmet from 'helmet';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import Blockchain from './blockchain.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nodeAddress = uuidv4().split('-').join('');
const mitcoin = new Blockchain();
const app = express();
const port = process.argv[2];

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile('./blockexplorer/index.html', { root: __dirname });
});

app.get('/blockchain', (req, res) => {
  res.send(mitcoin);
});

app.post('/transaction', (req, res) => {
  const { newTransAction } = req.body;

  const blockIndex = mitcoin.addTransactionToPendingList(newTransAction);

  res.json({ note: `Transaction will be added in block ${blockIndex}` });
});

app.post('/transaction/broadcast', (req, res) => {
  const { amount, sender, recepient } = req.body;

  if (
    typeof amount !== 'number' ||
    typeof sender !== 'string' ||
    typeof recepient !== 'string'
  ) {
    const error = new Error(
      'unacceptable data types! please check your values'
    );
    error.statusCode = 400;
    throw error;
  }
  const newTransAction = mitcoin.createNewTransaction(
    amount,
    sender,
    recepient
  );

  mitcoin.addTransactionToPendingList(newTransAction);

  mitcoin.networkNodes.forEach(async (networkNodeURL) => {
    if (mitcoin.currentNodeURL !== networkNodeURL) {
      await axios.post(`${networkNodeURL}/transaction`, { newTransAction });
    }
  });
  return res.json({
    note:
      'Transaction added to pending list successfully. It will get confirmed with the next Block mine',
  });
});

app.get('/mine', async (req, res) => {
  const prevBlock = mitcoin.getLastBlock();
  const prevBlockHash = prevBlock['hash'];
  const currentBlockData = {
    transactions: mitcoin.pendingTransactions,
    index: prevBlock['index'] + 1,
  };
  const nonce = mitcoin.proofOfWork(prevBlockHash, currentBlockData);
  const currentBlockHash = mitcoin.hashBlock(
    prevBlockHash,
    currentBlockData,
    nonce
  );

  const newBlock = mitcoin.createNewBlock(
    nonce,
    prevBlockHash,
    currentBlockHash
  );

  mitcoin.networkNodes.forEach(async (networkNodeURL) => {
    await axios.post(`${networkNodeURL}/receive-new-block`, { newBlock });
  });

  await axios.post(`${mitcoin.currentNodeURL}/transaction/broadcast`, {
    amount: 12.5,
    sender: '00REWARD',
    recepient: nodeAddress,
  });

  res.json({
    note: 'New Block mined successfully! Your reward is 12.5 Mitcoin!',
    block: newBlock,
  });
});

app.post('/receive-new-block', (req, res) => {
  const { newBlock } = req.body;
  const lastBlock = mitcoin.getLastBlock();

  if (
    lastBlock.hash === newBlock.previousBlockHash &&
    lastBlock['index'] + 1 === newBlock['index']
  ) {
    ('Here');
    mitcoin.chain.push(newBlock);
    mitcoin.pendingTransactions = [];

    res.json({ note: 'New Block received and accepted', newBlock });
  } else {
    res.json({ note: 'New Block rejected', newBlock });
  }
});

app.post('/register-and-broadcast-node', async (req, res) => {
  const newNodeURL = req.body.newNodeURL;
  if (mitcoin.networkNodes.indexOf(newNodeURL) == -1) {
    mitcoin.networkNodes.push(newNodeURL);
  }

  // broadcasting the new node to all other nodes in the network
  mitcoin.networkNodes.forEach(async (networkNodeURL) => {
    if (mitcoin.currentNodeURL !== networkNodeURL) {
      await axios.post(`${networkNodeURL}/register-node`, {
        newNodeURL,
      });
    }
  });

  // registering all the current network nodes with new node
  await axios.post(`${newNodeURL}/register-nodes-bulk`, {
    allNetWorkNode: [...mitcoin.networkNodes, mitcoin.currentNodeURL],
  });

  res.json({ note: 'New Node registered with network successfully' });
});

app.post('/register-node', (req, res) => {
  const newNodeURL = req.body.newNodeURL;

  if (
    mitcoin.networkNodes.indexOf(newNodeURL) == -1 &&
    mitcoin.currentNodeURL !== newNodeURL
  ) {
    mitcoin.networkNodes.push(newNodeURL);
    return res.json({ note: 'New Node registered successfully.' });
  }

  res.json({ note: 'You cannot add a network to itself' });
});

app.post('/register-nodes-bulk', (req, res) => {
  const allNetWorkNode = req.body.allNetWorkNode;

  allNetWorkNode.forEach((newNodeURL) => {
    if (
      mitcoin.networkNodes.indexOf(newNodeURL) == -1 &&
      mitcoin.currentNodeURL !== newNodeURL
    ) {
      mitcoin.networkNodes.push(newNodeURL);
    }
  });
  return res.json({ note: 'Node successfully added to the network' });
});

app.get('/consensus', (req, res) => {
  const instancesOfBlockchain = [];
  mitcoin.networkNodes.forEach(async (networkNodeURL) => {
    const resp = await axios.get(`${networkNodeURL}/blockchain`);

    const data = resp.data;

    instancesOfBlockchain.push(data);
  });

  const currentNodeChainLength = mitcoin.chain.length;
  let maxChainLength = currentNodeChainLenght;
  let newLongestChain = null;
  let newPendingTransactions = null;

  instancesOfBlockchain.forEach((blockchain) => {
    if (blockchain.chain.length > maxChainLength) {
      maxChainLength = blockchain.chain.length;
      newLongestChain = blockchain.chain;
      newPendingTransactions = blockchain.pendingTransactions;
    }
  });

  if (
    !newLongestChain ||
    (newLongestChain && !mitcoin.chainIsValid(newLongestChain))
  ) {
    res.json({
      note: 'Current chain has not been replaced',
      chain: mitcoin.chain,
    });
  } else if (newLongestChain && mitcoin.chainIsValid(newLongestChain)) {
    mitcoin.chain = newLongestChain;
    mitcoin.pendingTransactions = newPendingTransactions;

    res.json({ note: 'This chain has been replaced', chain: mitcoin.chain });
  }
});

app.get('/block/:blockHash', (req, res) => {
  const { blockHash } = req.params;

  const block = mitcoin.getBlock(blockHash);

  res.json({ block });
});

app.get('/transaction/:id', (req, res) => {
  const { id } = req.params;

  const { transaction, block } = mitcoin.getTransaction(id);

  res.json({ transaction, block });
});

app.get('/address/:address', (req, res) => {
  const { address } = req.params;

  const { addressTransaction, balance } = mitcoin.getAddress(address);
  res.json({ addressTransaction, balance });
});

// General error handler for routes
app.use((error, req, res, send) => {
  console.error(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;

  res.status(status).json({ message, data });
});

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
