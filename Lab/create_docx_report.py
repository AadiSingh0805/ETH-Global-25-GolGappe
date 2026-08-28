import json
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

def format_run(run, font_name="Times New Roman", font_size=12, bold=False, italic=False, color_rgb=(0, 0, 0), highlight=False):
    run.font.name = font_name
    run.font.size = Pt(font_size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)
    if highlight:
        hl = parse_xml(f'<w:highlight {nsdecls("w")} w:val="yellow"/>')
        run._r.get_or_add_rPr().append(hl)

def add_paragraph_formatted(doc, text, bold=False, italic=False, align=WD_ALIGN_PARAGRAPH.LEFT, highlight=False):
    p = doc.add_paragraph()
    p.alignment = align
    run = p.add_run(text)
    format_run(run, bold=bold, italic=italic, highlight=highlight)
    return p

def add_heading_formatted(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    for r in h.runs:
        format_run(r, bold=True)
    return h

def add_code_block(doc, title, code_lines, highlighted_indices):
    p = doc.add_paragraph()
    r = p.add_run(title)
    format_run(r, bold=True)
    
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_cell_background(cell, "FAFAFA")
    set_cell_margins(cell, top=100, bottom=100, left=150, right=150)
    
    for idx, line in enumerate(code_lines):
        if idx == 0:
            cell_p = cell.paragraphs[0]
        else:
            cell_p = cell.add_paragraph()
        
        cell_p.paragraph_format.space_before = Pt(0)
        cell_p.paragraph_format.space_after = Pt(0)
        cell_p.paragraph_format.line_spacing = 1.15
        
        is_highlighted = idx in highlighted_indices
        r = cell_p.add_run(line)
        format_run(r, bold=is_highlighted, highlight=is_highlighted)
    
    doc.add_paragraph()

def create_report():
    scratch_dir = os.path.join(os.path.dirname(__file__), 'chain', 'scratch')
    before_path = os.path.join(scratch_dir, 'gas_before.json')
    after_path = os.path.join(scratch_dir, 'gas_after.json')

    with open(before_path, 'r') as f:
        before_data = json.load(f)
    with open(after_path, 'r') as f:
        after_data = json.load(f)

    doc = Document()

    # Configure Normal Style default font
    style = doc.styles['Normal']
    style.font.name = 'Times New Roman'
    style.font.size = Pt(12)
    style.font.color.rgb = RGBColor(0, 0, 0)

    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Document Header
    add_paragraph_formatted(doc, "Smart Contract Gas Optimization Report", bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_paragraph_formatted(doc, "Empirical Gas Measurement & Code Comparison", italic=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()

    # Section 1: Executive Summary
    add_heading_formatted(doc, "1. Executive Summary", level=1)
    p = doc.add_paragraph()
    r = p.add_run(
        "This document presents the empirical gas benchmarking results and exact smart contract code modifications "
        "for 5 function optimizations performed in BountyBoard.sol and LocalSwapPool.sol. "
        "All measurements reflect exact EVM gas consumption captured via Hardhat local network execution before and after optimization."
    )
    format_run(r)
    doc.add_paragraph()

    # Section 2: Gas Comparison Table
    add_heading_formatted(doc, "2. Empirical Gas Metrics Table", level=1)
    
    table = doc.add_table(rows=1, cols=5)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table.rows[0].cells
    headers = ["Function Name", "Before (Gas)", "After (Gas)", "Gas Saved", "% Reduction"]
    
    for i, title in enumerate(headers):
        hdr_cells[i].text = title
        set_cell_background(hdr_cells[i], "E6E6E6")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=120, right=120)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        for r in p.runs:
            format_run(r, bold=True)

    total_before = 0
    total_after = 0

    for fn_name, before_gas in before_data.items():
        after_gas = after_data[fn_name]
        saved = before_gas - after_gas
        pct = (saved / before_gas) * 100

        total_before += before_gas
        total_after += after_gas

        row_cells = table.add_row().cells
        row_cells[0].text = fn_name
        row_cells[1].text = f"{before_gas:,}"
        row_cells[2].text = f"{after_gas:,}"
        row_cells[3].text = f"{saved:,}"
        row_cells[4].text = f"{pct:.2f}%"

        for i, cell in enumerate(row_cells):
            set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
            p = cell.paragraphs[0]
            if i > 0:
                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            for r in p.runs:
                format_run(r)

    # Total Row
    total_saved = total_before - total_after
    total_pct = (total_saved / total_before) * 100
    tot_cells = table.add_row().cells
    tot_cells[0].text = "Total"
    tot_cells[1].text = f"{total_before:,}"
    tot_cells[2].text = f"{total_after:,}"
    tot_cells[3].text = f"{total_saved:,}"
    tot_cells[4].text = f"{total_pct:.2f}%"

    for i, cell in enumerate(tot_cells):
        set_cell_background(cell, "D9D9D9")
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        if i > 0:
            p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        for r in p.runs:
            format_run(r, bold=True)

    doc.add_paragraph()

    # Section 3: Code Snippets & Modifications
    add_heading_formatted(doc, "3. Code Optimization Snippets", level=1)

    # Function 1
    add_heading_formatted(doc, "Function 1: BountyBoard.registerRepo", level=2)
    p = doc.add_paragraph()
    r = p.add_run("Optimizations: Replaced string require statements with Custom Errors and packed Struct storage slots.")
    format_run(r)
    
    code_1_before = [
        "function registerRepo(uint256 repoId, string calldata repoUrl) external {",
        "    require(repoId > 0, 'Invalid repoId');",
        "    require(bytes(repoUrl).length > 0, 'repoUrl required');",
        "    require(!repos[repoId].exists, 'Repo already registered');",
        "",
        "    Repo storage repo = repos[repoId];",
        "    repo.repoUrl = repoUrl;",
        "    repo.owner = msg.sender;",
        "    repo.exists = true;",
        "",
        "    repoIds.push(repoId);",
        "    emit RepoRegistered(repoId, repoUrl, msg.sender);",
        "}"
    ]
    add_code_block(doc, "Before Optimization:", code_1_before, [])

    code_1_after = [
        "function registerRepo(uint256 repoId, string calldata repoUrl) external {",
        "    if (repoId == 0) revert InvalidRepoId();",
        "    if (bytes(repoUrl).length == 0) revert RepoUrlRequired();",
        "",
        "    Repo storage repo = repos[repoId];",
        "    if (repo.exists) revert RepoAlreadyRegistered();",
        "",
        "    repo.repoUrl = repoUrl;",
        "    repo.owner = msg.sender;",
        "    repo.exists = true;",
        "",
        "    repoIds.push(repoId);",
        "    emit RepoRegistered(repoId, repoUrl, msg.sender);",
        "}"
    ]
    add_code_block(doc, "After Optimization (Changes Highlighted):", code_1_after, [1, 2, 5])

    # Function 2
    add_heading_formatted(doc, "Function 2: BountyBoard.donateToRepo", level=2)
    p = doc.add_paragraph()
    r = p.add_run("Optimizations: Replaced string require validation with Custom Errors and direct storage pointer access.")
    format_run(r)

    code_2_before = [
        "function donateToRepo(uint256 repoId) external payable {",
        "    require(repos[repoId].exists, 'Repo not registered');",
        "    require(msg.value > 0, 'Donation amount must be > 0');",
        "",
        "    repos[repoId].pool += msg.value;",
        "    emit RepoDonation(repoId, msg.value, msg.sender);",
        "}"
    ]
    add_code_block(doc, "Before Optimization:", code_2_before, [])

    code_2_after = [
        "function donateToRepo(uint256 repoId) external payable {",
        "    Repo storage repo = repos[repoId];",
        "    if (!repo.exists) revert RepoNotRegistered();",
        "    if (msg.value == 0) revert InvalidDonationAmount();",
        "",
        "    repo.pool += msg.value;",
        "    emit RepoDonation(repoId, msg.value, msg.sender);",
        "}"
    ]
    add_code_block(doc, "After Optimization (Changes Highlighted):", code_2_after, [1, 2, 3])

    # Function 3
    add_heading_formatted(doc, "Function 3: BountyBoard.createBounty", level=2)
    p = doc.add_paragraph()
    r = p.add_run("Optimizations: Replaced string require statements with Custom Errors and omitted redundant zero assignments for fresh storage structs.")
    format_run(r)

    code_3_before = [
        "function createBounty(uint256 repoId, uint256 issueId, string calldata issueUrl) external payable {",
        "    require(repos[repoId].exists, 'Repo not registered');",
        "    require(issueId > 0, 'Invalid issueId');",
        "    require(bytes(issueUrl).length > 0, 'issueUrl required');",
        "    require(msg.value > 0, 'Bounty amount must be > 0');",
        "",
        "    bytes32 key = _key(repoId, issueId);",
        "    Bounty storage bounty = bounties[key];",
        "    bool isNewBounty = !bounty.exists;",
        "    require(isNewBounty || bounty.claimed, 'Bounty already exists');",
        "",
        "    bounty.repoId = repoId;",
        "    bounty.issueId = issueId;",
        "    bounty.issueUrl = issueUrl;",
        "    bounty.amount = msg.value;",
        "    bounty.creator = msg.sender;",
        "    bounty.recipient = address(0);",
        "    bounty.claimed = false;",
        "    bounty.exists = true;",
        "",
        "    if (isNewBounty) { repos[repoId].issueIds.push(issueId); }",
        "    emit BountyCreated(repoId, issueId, issueUrl, msg.value, msg.sender);",
        "}"
    ]
    add_code_block(doc, "Before Optimization:", code_3_before, [])

    code_3_after = [
        "function createBounty(uint256 repoId, uint256 issueId, string calldata issueUrl) external payable {",
        "    if (!repos[repoId].exists) revert RepoNotRegistered();",
        "    if (issueId == 0) revert InvalidIssueId();",
        "    if (bytes(issueUrl).length == 0) revert IssueUrlRequired();",
        "    if (msg.value == 0) revert InvalidBountyAmount();",
        "",
        "    bytes32 key = _key(repoId, issueId);",
        "    Bounty storage bounty = bounties[key];",
        "    bool isNewBounty = !bounty.exists;",
        "    if (!isNewBounty && !bounty.claimed) revert BountyAlreadyExists();",
        "",
        "    bounty.repoId = repoId;",
        "    bounty.issueId = issueId;",
        "    bounty.issueUrl = issueUrl;",
        "    bounty.amount = msg.value;",
        "    bounty.creator = msg.sender;",
        "    bounty.exists = true;",
        "",
        "    if (isNewBounty) { repos[repoId].issueIds.push(issueId); }",
        "    emit BountyCreated(repoId, issueId, issueUrl, msg.value, msg.sender);",
        "}"
    ]
    add_code_block(doc, "After Optimization (Changes Highlighted):", code_3_after, [1, 2, 3, 4, 9, 16])

    # Function 4
    add_heading_formatted(doc, "Function 4: BountyBoard.claimBounty", level=2)
    p = doc.add_paragraph()
    r = p.add_run("Optimizations: Implemented short-circuit lazy storage reading for repo owner and custom error reverts.")
    format_run(r)

    code_4_before = [
        "function claimBounty(uint256 repoId, uint256 issueId, address payable recipient) external {",
        "    require(recipient != address(0), 'Invalid recipient');",
        "",
        "    bytes32 key = _key(repoId, issueId);",
        "    Bounty storage bounty = bounties[key];",
        "    require(bounty.exists, 'Bounty not found');",
        "    require(!bounty.claimed, 'Bounty already claimed');",
        "",
        "    Repo storage repo = repos[repoId];",
        "    require(msg.sender == bounty.creator || msg.sender == repo.owner, 'Only repo owner or bounty creator');",
        "",
        "    bounty.claimed = true;",
        "    bounty.recipient = recipient;",
        "",
        "    uint256 amount = bounty.amount;",
        "    (bool sent, ) = recipient.call{value: amount}('');",
        "    require(sent, 'Transfer failed');",
        "",
        "    emit BountyClaimed(repoId, issueId, recipient, amount);",
        "}"
    ]
    add_code_block(doc, "Before Optimization:", code_4_before, [])

    code_4_after = [
        "function claimBounty(uint256 repoId, uint256 issueId, address payable recipient) external {",
        "    if (recipient == address(0)) revert InvalidRecipient();",
        "",
        "    bytes32 key = _key(repoId, issueId);",
        "    Bounty storage bounty = bounties[key];",
        "    if (!bounty.exists) revert BountyNotFound();",
        "    if (bounty.claimed) revert BountyAlreadyClaimed();",
        "",
        "    address creator = bounty.creator;",
        "    if (msg.sender != creator) {",
        "        if (msg.sender != repos[repoId].owner) revert Unauthorized();",
        "    }",
        "",
        "    bounty.claimed = true;",
        "    bounty.recipient = recipient;",
        "",
        "    uint256 amount = bounty.amount;",
        "    (bool sent, ) = recipient.call{value: amount}('');",
        "    if (!sent) revert TransferFailed();",
        "",
        "    emit BountyClaimed(repoId, issueId, recipient, amount);",
        "}"
    ]
    add_code_block(doc, "After Optimization (Changes Highlighted):", code_4_after, [1, 5, 6, 8, 9, 10, 11, 18])

    # Function 5
    add_heading_formatted(doc, "Function 5: LocalSwapPool.swapToken0ForToken1", level=2)
    p = doc.add_paragraph()
    r = p.add_run("Optimizations: Cached reserve1 storage variable in local stack memory (_reserve1) and replaced string requires with Custom Errors.")
    format_run(r)

    code_5_before = [
        "function swapToken0ForToken1(uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {",
        "    amountOut = getAmountOut(amountIn, true);",
        "    require(amountOut >= minAmountOut, 'Slippage exceeded');",
        "    require(amountOut <= reserve1, 'Insufficient reserve');",
        "",
        "    bool received = token0.transferFrom(msg.sender, address(this), amountIn);",
        "    require(received, 'Token0 transfer failed');",
        "",
        "    reserve0 += amountIn;",
        "    reserve1 -= amountOut;",
        "",
        "    bool sent = token1.transfer(msg.sender, amountOut);",
        "    require(sent, 'Token1 transfer failed');",
        "",
        "    emit Swapped(msg.sender, address(token0), amountIn, address(token1), amountOut);",
        "}"
    ]
    add_code_block(doc, "Before Optimization:", code_5_before, [])

    code_5_after = [
        "function swapToken0ForToken1(uint256 amountIn, uint256 minAmountOut) external returns (uint256 amountOut) {",
        "    amountOut = getAmountOut(amountIn, true);",
        "    if (amountOut < minAmountOut) revert SlippageExceeded();",
        "",
        "    uint256 _reserve1 = reserve1;",
        "    if (amountOut > _reserve1) revert InsufficientReserve();",
        "",
        "    bool received = token0.transferFrom(msg.sender, address(this), amountIn);",
        "    if (!received) revert TransferFailed();",
        "",
        "    reserve0 += amountIn;",
        "    reserve1 = _reserve1 - amountOut;",
        "",
        "    bool sent = token1.transfer(msg.sender, amountOut);",
        "    if (!sent) revert TransferFailed();",
        "",
        "    emit Swapped(msg.sender, address(token0), amountIn, address(token1), amountOut);",
        "}"
    ]
    add_code_block(doc, "After Optimization (Changes Highlighted):", code_5_after, [2, 4, 5, 8, 11, 14])

    # Save output
    out_docx_path = os.path.join(os.path.dirname(__file__), 'Gas_Optimization_Report.docx')
    try:
        doc.save(out_docx_path)
        print(f"Successfully generated formatted docx report at: {out_docx_path}")
    except PermissionError:
        out_docx_path = os.path.join(os.path.dirname(__file__), 'Gas_Optimization_Report_v2.docx')
        doc.save(out_docx_path)
        print(f"Primary file was locked. Successfully generated formatted docx report at: {out_docx_path}")

if __name__ == '__main__':
    create_report()
