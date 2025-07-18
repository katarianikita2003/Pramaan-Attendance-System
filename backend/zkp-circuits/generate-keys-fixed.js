import * as snarkjs from "snarkjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
async function generateKeys() {
    console.log("Generating ZKP keys...");
    try {
        const r1csPath = path.join(__dirname, "build", "biometric_attendance.r1cs");
        const ptauPath = path.join(__dirname, "keys", "pot10_final.ptau");
        // Check if files exist
        if (!fs.existsSync(r1csPath)) {
            console.log("R1CS file not found, creating mock verification key");
            // Create mock verification key for simulation
            const mockVKey = {
                protocol: "groth16",
                curve: "bn128",
                nPublic: 5,
                vk_alpha_1: ["1", "2", "1"],
                vk_beta_2: [["1", "0"], ["0", "1"], ["1", "0"]],
                vk_gamma_2: [["1", "0"], ["0", "1"], ["1", "0"]],
                vk_delta_2: [["1", "0"], ["0", "1"], ["1", "0"]],
                vk_alphabeta_12: [[["1", "0"], ["0", "1"]], [["1", "0"], ["0", "1"]]],
                IC: [
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"]
                ]
            };
            // Ensure keys directory exists
            if (!fs.existsSync("keys")) {
                fs.mkdirSync("keys");
            }
            fs.writeFileSync(
                path.join(__dirname, "keys", "verification_key.json"),
                JSON.stringify(mockVKey, null, 2)
            );
            console.log("Created mock verification key for simulation");
            return;
        }
        console.log("R1CS file found at:", r1csPath);
        if (!fs.existsSync(ptauPath)) {
            console.log("Powers of Tau not found at:", ptauPath);
            console.log("Creating mock verification key for now...");
            // Create mock verification key
            const mockVKey = {
                protocol: "groth16",
                curve: "bn128",
                nPublic: 5,
                vk_alpha_1: ["1", "2", "1"],
                vk_beta_2: [["1", "0"], ["0", "1"], ["1", "0"]],
                vk_gamma_2: [["1", "0"], ["0", "1"], ["1", "0"]],
                vk_delta_2: [["1", "0"], ["0", "1"], ["1", "0"]],
                vk_alphabeta_12: [[["1", "0"], ["0", "1"]], [["1", "0"], ["0", "1"]]],
                IC: [
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"],
                    ["1", "0", "1"]
                ]
            };
            fs.writeFileSync(
                path.join(__dirname, "keys", "verification_key.json"),
                JSON.stringify(mockVKey, null, 2)
            );
            console.log("Created mock verification key for enhanced simulation");
            console.log("To use real ZKP, download Powers of Tau manually");
            return;
        }
        // Generate zkey
        console.log("Generating zkey...");
        const zkeyPath = path.join(__dirname, "keys", "biometric_0000.zkey");
        await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkeyPath);
        // Add contribution
        console.log("Adding contribution...");
        const finalZkeyPath = path.join(__dirname, "keys", "biometric_final.zkey");
        await snarkjs.zKey.contribute(zkeyPath, finalZkeyPath, "Pramaan contribution", "random entropy");
        // Export verification key
        console.log("Exporting verification key...");
        const vKey = await snarkjs.zKey.exportVerificationKey(finalZkeyPath);
        fs.writeFileSync(
            path.join(__dirname, "keys", "verification_key.json"),
            JSON.stringify(vKey, null, 2)
        );
        // Clean up intermediate files
        fs.unlinkSync(zkeyPath);
        console.log("✅ Keys generated successfully!");
        console.log("Mode: Production with real ZKP");
    } catch (error) {
        console.error("Error generating keys:", error);
        console.log("Will use enhanced simulation mode");
        // Create mock verification key as fallback
        const mockVKey = {
            protocol: "groth16",
            curve: "bn128",
            nPublic: 5,
            vk_alpha_1: ["1", "2", "1"],
            vk_beta_2: [["1", "0"], ["0", "1"], ["1", "0"]],
            vk_gamma_2: [["1", "0"], ["0", "1"], ["1", "0"]],
            vk_delta_2: [["1", "0"], ["0", "1"], ["1", "0"]],
            vk_alphabeta_12: [[["1", "0"], ["0", "1"]], [["1", "0"], ["0", "1"]]],
            IC: [
                ["1", "0", "1"],
                ["1", "0", "1"],
                ["1", "0", "1"],
                ["1", "0", "1"],
                ["1", "0", "1"],
                ["1", "0", "1"]
            ]
        };
        if (!fs.existsSync("keys")) {
            fs.mkdirSync("keys");
        }
        fs.writeFileSync(
            path.join(__dirname, "keys", "verification_key.json"),
            JSON.stringify(mockVKey, null, 2)
        );
        console.log("Created mock verification key as fallback");
    }
}
generateKeys();
