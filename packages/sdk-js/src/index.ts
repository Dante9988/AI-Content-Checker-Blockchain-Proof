/**
 * VeriChain SDK - Main Entry Point
 * 
 * Exports all types, utilities, and client classes for the VeriChain system.
 */

// Export all types
export * from "./types.js";

// Export client and utilities
export * from "./client.js";

// Re-export commonly used items for convenience
export { VeriChainClient as Client } from "./client.js";
export { veriChain as default } from "./client.js";
