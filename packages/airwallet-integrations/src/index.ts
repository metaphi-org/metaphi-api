/* tslint:disable */

import type {
  Actions,
  AddEthereumChainParameter,
  Provider,
} from '@web3-react/types'
import { Connector } from '@web3-react/types'
import { WalletPlugin } from '@metaphi/airwallet-api'

type MetaphiWallet = {
  connect: (callback: (msg: object) => void) => void;
  init: () => void;
  disconnect: () => void;
  getAddress: () => string;
  signMessage: (payload: { message: string }, callback: (sig: { sig: string, err?: string }) => void ) => void;
  signTransation: (payload: { message: string }, callback: (sig: object) => void ) => void;
  getProvider: () => Provider;
  getChainId: () => number;
};

type MetaphiProvider = Provider & { isMetaphi?: boolean; isConnected?: () => boolean; providers?: MetaphiProvider[], getSigner: Function}

type MetaphAccountConfig = {
  clientId: string
  apiKey: string
  domain: string
  dApp?: string
}

type MetaphiNetworkConfig = {
  rpcUrl: string,
  chainId: number, 
  name: string,
}

type MetaphiCustomConfig = {
  userInputMethod: any
}

type MetaphiConfigOptions = {
  accountConfig: MetaphAccountConfig
  networkConfig: MetaphiNetworkConfig
  custom: MetaphiCustomConfig
}

declare global {
  interface Window {
    MetaphiModal: any;
    mWallet: MetaphiWallet | undefined;
  }
}

declare module "@metaphi/airwallet-api";

class MetaphiConnector extends Connector {
  /** {@inheritdoc Connector.provider} */
  declare public provider: MetaphiProvider | undefined
  declare public customProvider: MetaphiProvider | undefined

  private options: MetaphiConfigOptions | undefined
  private mWalletInstance: MetaphiWallet | undefined; 

  /**
   * @param connectEagerly - A flag indicating whether connection should be initiated when the class is constructed.
   * @param options - Options to pass to `@metamask/detect-provider`
   */
  constructor(actions: Actions, connectEagerly = false, options: MetaphiConfigOptions) {
    super(actions)

    if (connectEagerly && this.serverSide) {
      throw new Error('connectEagerly = true is invalid for SSR, instead use the connectEagerly method in a useEffect')
    }

    // console.log("Metaphi Wallet Configuration")
    this.options = options
    if (connectEagerly) void this.connectEagerly()
  }

  public get serverSide() {
    return typeof window === 'undefined'
  }

  public async addPlugin(): Promise<boolean> {
    const loadPlugin = !this.serverSide && !this.mWalletInstance
    if (!loadPlugin) return Promise.reject(false)
   
    return new Promise(async (resolve, reject) => {
      console.log('Adding metaphi plugin.')
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const opts = {...this.options, custom: { userInputMethod: window.MetaphiModal }}

      this.mWalletInstance = new WalletPlugin(opts);
      await this.mWalletInstance?.init();
        
      // Add Instance to window.
      window.mWallet = this.mWalletInstance
      
      resolve(true)
    })
  }

  private async isomorphicInitialize(): Promise<void> {
    console.log("Isomorphic Initializing.")
    if (this.serverSide) return Promise.reject(false); 

    // Add iframe and plugin instance.
    await this.addPlugin()
    if (this.mWalletInstance === undefined) return Promise.reject(false)

    return new Promise<void>((resolve, reject) => {
      this.mWalletInstance?.connect(async (msg: { connected?: boolean }) => {
        console.log('Connector: Metaphi Wallet Connected.')
        if (!this.mWalletInstance) { return reject() }
        if (!msg.connected) { return reject() }
  
        this.provider = this.mWalletInstance.getProvider() as MetaphiProvider
        this.customProvider = this.provider
        
        resolve()
      });
    });
  }

  /** {@inheritdoc Connector.connectEagerly} */
  public async connectEagerly(): Promise<void> {
    const cancelActivation = this.actions.startActivation()

    await this.isomorphicInitialize()
    if (!this.provider || !this.mWalletInstance) return cancelActivation()

    const chainId = this.mWalletInstance.getChainId()
    const accounts: string[] = [this.mWalletInstance.getAddress()]
    return this.actions.update({ accounts, chainId })
  }

  /**
   * Initiates a connection.
   *
   * @param desiredChainIdOrChainParameters - If defined, indicates the desired chain to connect to. If the user is
   * already connected to this chain, no additional steps will be taken. Otherwise, the user will be prompted to switch
   * to the chain, if one of two conditions is met: either they already have it added in their extension, or the
   * argument is of type AddEthereumChainParameter, in which case the user will be prompted to add the chain with the
   * specified parameters first, before being prompted to switch.
   */
  public async activate(desiredChainIdOrChainParameters?: number | AddEthereumChainParameter): Promise<void> {
    let cancelActivation

    if (!this.provider?.isConnected?.()) { 
      cancelActivation = this.actions.startActivation()
    }

    await this.isomorphicInitialize()
    if (!this.provider || !this.mWalletInstance) { 
      if (cancelActivation) cancelActivation()
      return
    }

    const accounts: string[] = [this.mWalletInstance.getAddress()]
    const chainId: number = this.mWalletInstance.getChainId()
    return this.actions.update({ accounts, chainId })
  }
  
  public deactivate(...args: unknown[]): Promise<void> | void {
    this.mWalletInstance?.disconnect()
    this.mWalletInstance = undefined
    this.options = undefined
  }
}

export { MetaphiConnector }