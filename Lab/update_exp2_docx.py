import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def format_run(run, font_name="Times New Roman", font_size=12, bold=False, italic=False, color_rgb=(0, 0, 0)):
    run.font.name = font_name
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)

def add_paragraph_formatted(doc, text="", bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12):
    p = doc.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15
    if text:
        run = p.add_run(text)
        format_run(run, bold=bold, italic=italic, font_size=font_size)
    return p

def add_heading_formatted(doc, text, level=1):
    h = doc.add_heading(level=level)
    h.paragraph_format.space_before = Pt(12 if level==1 else 8)
    h.paragraph_format.space_after = Pt(4)
    run = h.add_run(text)
    font_size = 18 if level == 1 else (14 if level == 2 else 12)
    format_run(run, font_name="Times New Roman", font_size=font_size, bold=True)
    return h

def add_code_block(doc, code_text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_cell_background(cell, "F8F9FA")
    set_cell_margins(cell, top=120, bottom=120, left=180, right=180)
    
    lines = code_text.split('\n')
    for idx, line in enumerate(lines):
        if idx == 0:
            cell_p = cell.paragraphs[0]
        else:
            cell_p = cell.add_paragraph()
        
        cell_p.paragraph_format.space_before = Pt(0)
        cell_p.paragraph_format.space_after = Pt(0)
        cell_p.paragraph_format.line_spacing = 1.05
        
        r = cell_p.add_run(line if line else ' ')
        format_run(r, font_name="Consolas", font_size=10)
    
    doc.add_paragraph()

def generate_exp2_docx():
    doc = Document()

    # Normal Style configuration
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    style.font.color.rgb = RGBColor(0, 0, 0)

    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Title & Subtitle
    add_paragraph_formatted(doc, "DApp Development: Wallet Integration", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=18)
    add_paragraph_formatted(doc, "Experiment 2", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14)
    doc.add_paragraph()

    # Aim
    add_heading_formatted(doc, "Aim : Integrating WalletConnect and MetaMask in DApps.", level=2)

    # Theory
    add_heading_formatted(doc, "Theory : ", level=2)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run("To interact with a blockchain like Ethereum or Filecoin, a Decentralized Application (DApp) needs a way to manage user identities, sign transactions, and read on-chain data. This is achieved through wallet providers.")
    format_run(r)

    # 1. MetaMask
    add_heading_formatted(doc, "1. MetaMask", level=3)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("MetaMask is the most popular browser extension and mobile wallet for Ethereum and EVM-compatible chains. It acts as a bridge between the browser and the blockchain by injecting a global window.ethereum provider object into the web page.")
    format_run(r)

    p2 = doc.add_paragraph()
    p2.paragraph_format.line_spacing = 1.15
    p2.paragraph_format.space_after = Pt(6)
    r_bold = p2.add_run("How it works: ")
    format_run(r_bold, bold=True)
    r_body = p2.add_run("When a DApp requests a connection, it calls methods on window.ethereum. MetaMask prompts the user to grant the application access to their public addresses. For state-changing operations, MetaMask will prompt the user to sign the transaction securely.")
    format_run(r_body)

    # 2. WalletConnect
    add_heading_formatted(doc, "2. WalletConnect", level=3)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("WalletConnect is an open protocol — not a wallet itself — that enables secure communication between DApps and mobile wallets.")
    format_run(r)

    p2 = doc.add_paragraph()
    p2.paragraph_format.line_spacing = 1.15
    p2.paragraph_format.space_after = Pt(6)
    r_bold = p2.add_run("How it works: ")
    format_run(r_bold, bold=True)
    r_body = p2.add_run("It uses an end-to-end encrypted connection established either by scanning a QR code (on desktop) or clicking a deep link (on mobile). This allows users to connect their preferred mobile wallet (like Trust Wallet, Rainbow, or the MetaMask mobile app) to a DApp running on a different device or browser securely.")
    format_run(r_body)

    # 3. Web3 Libraries
    add_heading_formatted(doc, "3. Web3 Libraries (ethers.js)", level=3)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(6)
    r = p.add_run("While DApps can interact with the injected provider directly, it is standard practice to use a library like ethers.js or web3.js. These libraries wrap the raw provider (whether from MetaMask or WalletConnect) and offer a developer-friendly API for contract interactions, formatting units, and managing signers.")
    format_run(r)

    # Code Section
    add_heading_formatted(doc, "Code", level=2)

    # Prerequisites
    add_heading_formatted(doc, "Prerequisites", level=3)
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("First, install the necessary dependencies:")
    format_run(r)
    
    add_code_block(doc, "npm install ethers @walletconnect/web3-provider")

    # Integration Implementation
    add_heading_formatted(doc, "Integration Implementation", level=3)
    
    code_text = '''import { ethers } from 'ethers';
import WalletConnectProvider from '@walletconnect/web3-provider';

class WalletIntegrationService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.userAddress = null;
    }

    /**
     * Connect using MetaMask (Injected Provider)
     */
    async connectMetaMask() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access from MetaMask
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                // Wrap the injected provider with ethers.js
                const browserProvider = new ethers.BrowserProvider(window.ethereum);
                this.signer = await browserProvider.getSigner();
                this.userAddress = await this.signer.getAddress();
                this.provider = browserProvider;
                
                console.log("Connected to MetaMask:", this.userAddress);
                return this.userAddress;
            } catch (error) {
                console.error("MetaMask connection failed:", error);
                throw error;
            }
        } else {
            alert("Please install MetaMask!");
            throw new Error("MetaMask not found");
        }
    }

    /**
     * Connect using WalletConnect
     */
    async connectWalletConnect() {
        try {
            // Configure the WalletConnect Provider
            const walletConnectProvider = new WalletConnectProvider({
                rpc: {
                    // Example: Mainnet and testnets (Sepolia / Filecoin Calibration)
                    1: "https://cloudflare-eth.com/", 
                    314159: "https://api.calibration.node.glif.io/rpc/v1" 
                },
                qrcode: true,
            });

            // Enable session (triggers QR Code modal)
            await walletConnectProvider.enable();

            // Wrap the provider with ethers.js (v6 uses BrowserProvider for EIP-1193 providers)
            const web3Provider = new ethers.BrowserProvider(walletConnectProvider);
            this.signer = await web3Provider.getSigner();
            this.userAddress = await this.signer.getAddress();
            this.provider = web3Provider;

            console.log("Connected via WalletConnect:", this.userAddress);
            return this.userAddress;
        } catch (error) {
            console.error("WalletConnect connection failed:", error);
            throw error;
        }
    }

    /**
     * Listen for account or network changes
     */
    setupEventListeners(callback) {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                console.log("Account changed:", accounts[0]);
                callback(accounts[0]);
            });

            window.ethereum.on('chainChanged', (chainId) => {
                console.log("Network changed. Refreshing page...");
                window.location.reload();
            });
        }
    }
}

export default new WalletIntegrationService();'''

    add_code_block(doc, code_text)

    # Workflow & Screenshots Section
    add_heading_formatted(doc, "Execution Workflow & Verification", level=2)

    steps = [
        ("Ask User for Metamask and Github Auth", "scratch_images/image5.png"),
        ("Signature Request on Metamask", "scratch_images/image3.png"),
        ("10k ETH in Wallet currently", "scratch_images/image1.png"),
        ("Redeem Bounty", "scratch_images/image4.png"),
        ("Claimed 100 ETH Bounty", "scratch_images/image2.png")
    ]

    for title, img_path in steps:
        add_paragraph_formatted(doc, title, bold=True, font_size=12)
        if os.path.exists(img_path):
            img_p = doc.add_paragraph()
            img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            img_p.paragraph_format.space_after = Pt(12)
            img_run = img_p.add_run()
            img_run.add_picture(img_path, width=Inches(5.5))
        doc.add_paragraph()

    # Conclusion
    add_heading_formatted(doc, "Conclusion", level=2)
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Integrating wallet providers like MetaMask and WalletConnect is a fundamental step in DApp development, serving as the gateway for users to interact with Web3.")
    format_run(r)

    p2 = doc.add_paragraph()
    p2.paragraph_format.line_spacing = 1.15
    p2.paragraph_format.space_after = Pt(6)
    r = p2.add_run("By implementing MetaMask, applications cater to desktop users with browser extensions, offering quick and seamless transactions. By supporting WalletConnect, the DApp significantly broadens its accessibility, allowing users to connect a wide variety of mobile wallets securely without needing specialized browser extensions. Using a library like ethers.js abstracts the complexities of these different connection methods into a unified interface, simplifying the process of querying the blockchain and executing smart contract transactions.")
    format_run(r)

    target_path = "Defi Exp 2.docx"
    try:
        doc.save(target_path)
        print(f"Successfully generated formatted docx at: {target_path}")
    except PermissionError:
        target_path = "Defi Exp 2_v2.docx"
        doc.save(target_path)
        print(f"Primary file locked. Generated at: {target_path}")

if __name__ == '__main__':
    generate_exp2_docx()
