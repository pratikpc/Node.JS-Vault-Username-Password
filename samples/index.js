// process.env.DEBUG = 'node-vault'; // switch on debug mode
const { VaultAccess } = require("node-vault-user-pass");

const Vault = new VaultAccess({
	Authority: ["create", "read", "update", "delete", "list", "sudo"],
	Path: 'path',
	Policy: 'auth_policy',
	EndPoint: 'http://localhost:8200',
	UserName: "username",
	SecretMountPoint: 'secret_zone',
	// Either Set this in Command Line as an Environment Variable
	// Use set VAULT_TOKEN or export VAULT_TOKEN depending
	// upon your OS
	// Or Provide it as String Here
	// This must be a Root Token
	// Or a token with substantial access
	Token: String(process.env.VAULT_TOKEN),
	// Yet to be Implemented
	CertificateMountPoint: "certificate"
})

async function run() {
	// In Order to run Setup, the user needs Root Token
	await Vault.Setup();
	await Vault.SignUp('password' /*, 'username' */);
	console.log("Sign Up Successfull");
	await Vault.SignIn('password' /*, 'username' */);
	console.log("Sign In Successfull");

	const value = {
		foo: '3',
		bar: '4'
	};
	await Vault.Write('key', value);
	console.log("Wrote Value", value, "successfully");
	const val = await Vault.Read('key');
	console.log("Read value is ", val);

	// Unmount is an admin action
	// As such, the user needs Root Token
	// Or At least access to /sys/mount provided
	await Vault.Unmount();
}

run().then(() => { console.log("done") })
