import snarkjs from 'snarkjs';
import { ethers } from 'ethers';
import circomlib from 'circomlib';

/**
 * Proof Generation Utility
 * Generates zk-SNARK proofs for private votes
 */

class ProofGenerator {
  constructor() {
    this.circuitWasm = null;
    this.circuitZkey = null;
  }

  /**
   * Load circuit and proving key files
   * @param {string} wasmPath - Path to WASM file
   * @param {string} zkeyPath - Path to zkey file
   */
  async initialize(wasmPath, zkeyPath) {
    try {
      // Load WASM
      const wasmResponse = await fetch(wasmPath);
      this.circuitWasm = await wasmResponse.arrayBuffer();

      // Load zkey
      const zkeyResponse = await fetch(zkeyPath);
      const zkeyBuffer = await zkeyResponse.arrayBuffer();
      this.circuitZkey = zkeyBuffer;

      console.log('Circuit files loaded successfully');
    } catch (error) {
      console.error('Error loading circuit files:', error);
      throw error;
    }
  }

  /**
   * Generate proof for a vote
   * @param {Object} input - Circuit input { secret, choice, nullifier }
   * @returns {Object} { proof, publicSignals }
   */
  async generateProof(input) {
    try {
      if (!this.circuitWasm || !this.circuitZkey) {
        throw new Error('Circuit not initialized. Call initialize() first');
      }

      // Generate witness
      const wasmExports = await WebAssembly.instantiate(this.circuitWasm);
      const circuit = wasmExports.instance.exports;

      // Create witness array
      const witness = this.buildWitness(input, circuit);

      // Generate proof
      const { proof, publicSignals } = await snarkjs.groth16.prove(
        this.circuitZkey,
        witness
      );

      return {
        proof,
        publicSignals
      };
    } catch (error) {
      console.error('Error generating proof:', error);
      throw error;
    }
  }

  /**
   * Verify a proof
   * @param {Object} verifyingKey - Verification key
   * @param {Array} publicSignals - Public signals
   * @param {Object} proof - The proof to verify
   * @returns {boolean}
   */
  async verifyProof(verifyingKey, publicSignals, proof) {
    try {
      const isValid = await snarkjs.groth16.verify(
        verifyingKey,
        publicSignals,
        proof
      );
      return isValid;
    } catch (error) {
      console.error('Error verifying proof:', error);
      return false;
    }
  }

  /**
   * Build witness for the circuit
   * Maps circuit inputs to proper format
   */
  buildWitness(input, circuit) {
    // Convert inputs to proper format
    const secret = BigInt(input.secret);
    const choice = BigInt(input.choice);
    const nullifier = BigInt(input.nullifier);

    // Create witness array (simplified)
    const witness = [
      BigInt(1), // Constant input
      secret,
      choice,
      nullifier
    ];

    return witness;
  }

  /**
   * Create vote commitment
   */
  static createCommitment(secret, choice) {
    // Hash using Poseidon or Keccak
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256'],
      [secret, choice]
    );
    return ethers.keccak256(encoded);
  }

  /**
   * Create nullifier hash
   */
  static createNullifierHash(secret, nullifier) {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['uint256', 'uint256'],
      [secret, nullifier]
    );
    return ethers.keccak256(encoded);
  }

  /**
   * Encode proof for on-chain verification
   */
  static encodeProof(proof) {
    // Convert proof to bytes for Solidity
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['tuple(uint256,uint256[2],uint256[2][2])'],
      [{
        a: [proof.pi_a[0], proof.pi_a[1]],
        b: [proof.pi_b[0], proof.pi_b[1]],
        c: [proof.pi_c[0], proof.pi_c[1]]
      }]
    );
    return encoded;
  }
}

export default ProofGenerator;
