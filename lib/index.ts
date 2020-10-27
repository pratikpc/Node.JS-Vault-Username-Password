import NodeVault from "node-vault";

class VaultConfig {
  Path = "data";
  Policy = "AppPolicy";
  Authority: string[] = [];
  EndPoint = "http://localhost:8200";
  UserName = "";
  SecretMountPoint = "secret";
  CertificateMountPoint = "certificate";
  Token = String(process.env.VAULT_TOKEN);
  AltToken = "";
}

export class VaultAccess {
  // Use Vault Directly for Low level Operations
  public vault: NodeVault.client;
  public Config: VaultConfig;

  constructor(Config: Pick<VaultConfig, "Token"> & Partial<VaultConfig>) {
    // Lower Case All Params

    this.Config = new VaultConfig();

    this.Config.Path = (Config.Path || "data").toLowerCase();
    this.Config.Policy = (Config.Policy || "AppPolicy").toLowerCase();
    this.Config.Authority = Config.Authority || [];
    this.Config.EndPoint = Config.EndPoint || "http://localhost:8200";
    this.Config.SecretMountPoint = (
      Config.SecretMountPoint || "secret"
    ).toLowerCase();
    this.Config.CertificateMountPoint = (
      Config.CertificateMountPoint || "certificate"
    ).toLowerCase();
    this.Config.UserName = (Config.UserName || "").toLowerCase();

    this.Config.Path = `${this.Config.SecretMountPoint}/${this.Config.Path}`;

    this.vault = NodeVault({
      apiVersion: "v1",
      endpoint: this.Config.EndPoint,
      token: this.Config.Token
    });
  }

  public async Setup() {
    await this.InitVault();
    await this.InitLogin();
    await this.Mount();
  }

  public async InitVault() {
    return this.AdminMode(async () => {
      const checkInit = await this.vault.initialized();
      if (checkInit.initialized) return;
      const init = await this.vault.init({
        secret_shares: 1,
        secret_threshold: 1
      });
      this.vault.token = init.root_token;
      const key = init.keys[0];
      await this.vault.unseal({ secret_shares: 1, key: key });
    });
  }

  public async InitLogin() {
    return this.AdminMode(async () => {
      const auths = await this.vault.auths();
      if (auths.hasOwnProperty("userpass/")) return null;
      return await this.vault.enableAuth({
        mount_point: "userpass",
        type: "userpass",
        description: "userpass auth"
      });
    });
  }

  public async MountPresent(mountPoint: string = this.Config.SecretMountPoint) {
    const mounts = await this.vault.mounts();
    // Check if Mounting was Done
    return mounts[`${mountPoint}/`] != null;
  }

  // Need to Re-Sign-In After
  // Entering Admin Mode
  // eslint-disable-next-line @typescript-eslint/ban-types
  public async AdminMode(func: Function) {
    try {
      this.Config.AltToken = this.vault.token;
      this.vault.token = this.Config.Token;
      const result = await func();
      this.vault.token = this.Config.AltToken;
      return result;
    } catch (err) {
      this.vault.token = this.Config.AltToken;
      throw err;
    }
  }

  // This is An Admin Action
  public async Mount(mountPoint: string = this.Config.SecretMountPoint) {
    return this.AdminMode(async () => {
      // Check if Mounting was Done
      if (await this.MountPresent(mountPoint)) {
        return null;
      }
      return await this.vault.mount({
        mount_point: mountPoint,
        type: "kv",
        description: "Data Storage Mounted"
      });
    });
  }

  // This is An Admin Action
  public async Unmount(mountPoint: string = this.Config.SecretMountPoint) {
    return this.AdminMode(async () => {
      // Check if Mounting was Done
      if (!(await this.MountPresent(mountPoint))) {
        return null;
      }
      return await this.vault.unmount({
        mount_point: mountPoint
      });
    });
  }

  // Will Throw Exception on Sign In Failure
  public async SignIn(
    password: string,
    username: string = this.Config.UserName
  ) {
    const users = await this.UsersGet();
    if (!users.includes(username)) throw new Error("User Does Not Exist");
    const user = await this.vault.userpassLogin({
      username: username,
      password: password
    });
    this.Config.UserName = username;
    return user;
  }

  public async UsersGet() {
    try {
      const users = (await this.vault.list(`auth/userpass/users`)).data
        .keys as string[];
      return users;
    } catch (err) {
      return [];
    }
  }

  public async SignUp(
    password: string,
    username: string = this.Config.UserName,
    policy: string = this.Config.Policy
  ) {
    const users = await this.UsersGet();
    if (users.includes(username)) return null;
    this.Config.UserName = username;
    await this.AddPolicy();
    return await this.vault.write(`auth/userpass/users/${username}`, {
      password: password,
      policies: `${policy}/${username}`
    });
  }

  public async UserName() {
    if (this.Config.UserName != null && this.Config.UserName !== "")
      return this.Config.UserName;
    let user = (await this.TokenLookup()).data;

    if (user == null) return "";
    if (user.meta != null) user = user.meta;
    else if (user.display_name != null) return user.display_name;
    else return "";
    if (user != null) user = user.username;
    else return "";
    this.Config.UserName = user;
    return user;
  }

  public async ChangePassword(
    password: string,
    oldPassword: string,
    username: string = this.Config.UserName,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _policy: string = this.Config.Policy
  ) {
    await this.SignIn(oldPassword, username);
    const result = await this.vault.write(
      `auth/userpass/users/${username}/${oldPassword}`,
      { password: password }
    );
    await this.SignIn(password, username);
    return result;
  }

  public async PoliciesGet() {
    try {
      return (await this.vault.policies()).policies as string[];
    } catch (err) {
      return [];
    }
  }

  public async AddPolicy(
    policy: string = this.Config.Policy,
    mount_point: string = this.Config.Path,
    authority: string[] = this.Config.Authority,
    policy_add = false
  ) {
    if (!policy_add) {
      const policies = await this.PoliciesGet();
      if (policies.includes(`${policy}/${this.Config.UserName}`)) return null;
    }
    return await this.vault.addPolicy({
      name: `${policy}/${this.Config.UserName}`,
      rules: `path "${mount_point}/${
        this.Config.UserName
      }/*" { capabilities = ${JSON.stringify(authority)} }`
    });
  }

  public async Write(key: string, value: unknown) {
    return await this.vault.write(
      `${this.Config.Path}/${this.Config.UserName}/${key}`,
      {
        value: value
      }
    );
  }

  public async Read(key: string) {
    return (
      await this.vault.read(
        `${this.Config.Path}/${this.Config.UserName}/${key}`
      )
    ).data.value;
  }

  public async Delete(key: string) {
    return await this.vault.delete(
      `${this.Config.Path}/${this.Config.UserName}/${key}`
    );
  }

  public ChangeToken(token: string) {
    this.vault.token = token;
  }

  public async TokenLookup(token: string | undefined = undefined) {
    if (token != null)
      return await this.AdminMode(async () => {
        return await this.vault.tokenLookup({
          token: token
        });
      });
    return await this.vault.tokenLookupSelf();
  }
}
export default VaultAccess;
