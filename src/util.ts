export const median = (numbers: number[]): number => {
  let mid: number;
  const numsLen = numbers.length;
  numbers.sort();

  if (numsLen % 2 === 0) { // is even
    // average of two middle numbers
    mid = (numbers[numsLen / 2 - 1] + numbers[numsLen / 2]) / 2;
  } else { // is odd
    // middle number only
    mid = numbers[(numsLen - 1) / 2];
  }
  return mid;
};

export const writePriceToChain = async (web3: any, aggrAddr: string, aggrABI: object, oracleAddr: string, price: number, signer: any): Promise<number> => {
  const aggrContract = new web3.eth.Contract(aggrABI, aggrAddr);
  const roundInfo = await aggrContract.methods.oracleRoundState(oracleAddr, 0).call();
  if (!roundInfo._eligibleToSubmit) {
    throw new Error('Not eligible to submit price.')
  }
  const roundId = roundInfo._roundId;
  // To make it integer
  const prc = Math.round(price * 1000);
  const encoded = aggrContract.methods.submit(roundId, prc).encodeABI();

	const txn = await signer.signTransaction(
    {
			to: aggrAddr,
			data: encoded,
			value: "0x00",
			gasPrice: "0x01", // Hardcoding gas price as its fixed in the node
			gas: "0x1000000",
	  }
  );
	
  const txnReceipt = await web3.eth.sendSignedTransaction(txn.rawTransaction);
  return txnReceipt.blockNumber;  // Not returning block hash as its not reliable
}