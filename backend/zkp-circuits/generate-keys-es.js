import snarkjs from "snarkjs";
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
        if (!fs.existsSync(ptauPath)) {
            console.log("Powers of Tau not found, downloading...");
            // Try to download Powers of Tau
            try {
                const https = await import("https");
                const file = fs.createWriteStream(ptauPath);
                const download = (url) => {
                    return new Promise((resolve, reject) => {
                        https.get(url, (response) => {
                            if (response.statusCode === 200) {
                                response.pipe(file);
                                file.on("finish", () => {
                                    file.close();
                                    resolve();
                                });
                            } else {
                                reject(new Error(`Failed to download: ${response.statusCode}`));
                            }
                        }).on("error", reject);
                    });
                };
                console.log("Attempting to download Powers of Tau...");
                await download("https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_10.ptau");
                console.log("Powers of Tau downloaded successfully");
            } catch (error) {
                console.log("Failed to download Powers of Tau, will proceed without it");
                // Create mock verification key anyway
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
                return;
            }
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
    }
}
generateKeys();
