
# [Node.JS-Vault-Username-Password](https://github.com/pratikpc/Node.JS-Vault-Username-Password)
A sample code for Node.JS [Vault by Hashicorp](https://www.hashicorp.com/products/vault) involving [Username and Password based Authentication](https://learn.hashicorp.com/vault/secrets-management/sm-static-secrets#step-1-enable-kv-secrets-engine). This ensures that all data is securely stored behind password based authentication

For further details regarding Password Based Auth, check out [https://learn.hashicorp.com/vault/secrets-management/sm-static-secrets](https://learn.hashicorp.com/vault/secrets-management/sm-static-secrets)

This code ensures that One User cannot access data of another user present in the Vault. It uses the node-vault Library

## Sample Code
Check out this sample code in samples/example.js

    // process.env.DEBUG = 'node-vault'; // switch on debug mode
    const {VaultAccess} = require("../dist");
    
    const  Vault  =  new  VaultAccess({
    	Authority: ["create", "read", "update","delete","list","sudo"],
    	Path: 'path',
    	Policy: 'auth_policy',
    	EndPoint: 'http://localhost:8200',
    	UserName: "username",
    	SecretMountPoint: 'secret_zone',
    	CertificateMountPoint: "certificate",
    	Token: String(process.env.VAULT_TOKEN)
    })
    
    async function run(){
    	await Vault.Setup();
    	// Uncomment to SignUp
    	// await Vault.SignUp('password'/*, 'username' */);
    	await Vault.SignIn('password'/*, 'username' */);
    	await Vault.Write('key', {
    		foo: '3',
    		bar: '4'
    	});
    	const val = await Vault.Read('key');
    	// await Vault.Unmount();
    	console.log(val);
    }
    
    run().then(()=>{console.log("done")})

## Reason for Creation
1. To Ensure Secured Access to data
2. To Ensure Secured Storage of Data
3. This Project was mostly born out of a linkage with A Blockchain Based project where we needed to store Public and Private Keys in a secure manner

## TODO
1. [Add Support for Certificates](https://www.vaultproject.io/api-docs/secret/pki/)
