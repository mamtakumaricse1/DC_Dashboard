from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem


OUTPUT_PATH = "D:/DistrictD/Removed_KPIs_Department_Wise.pdf"

# KPIs present in KPI_Department_Wise_List.pdf but excluded from the 100-KPI dashboard seed
REMOVED_KPI_DATA = {
    "D01 — Health & NHM (2 removed of 12)": [
        "Maternal Deaths (this month, district total)",
        "Infant Deaths (this month, district total)",
    ],
    "D02 — School Education (4 removed of 12)": [
        "Out-of-School Children Identified & Mainstreamed",
        "Teacher Training Days Completed (cumulative)",
        "Schools Receiving Mid-Day Meal All Working Days",
        "EMRS / Ashram School Hostel Occupancy",
    ],
    "D03 — ICDS / Women & Child Development (4 removed of 9)": [
        "Hot Cooked Meal Days (per AWC per month)",
        "Severely Underweight Children (% of registered 0-6)",
        "Stunting Rate (Class 1 entrants, annual)",
        "AWWs with Smartphone & POSHAN App Active",
    ],
    "D04 — Social Justice / De-addiction / Youth (2 removed of 8)": [
        "Youth Skilling Enrolments (current month)",
        "NDPS Cases Registered + Disposal Status",
    ],
    "D05 — Rural Sanitation / Urban Local Bodies (1 removed of 6)": [
        "Drains Cleaned Pre-Monsoon (% of urban drains)",
    ],
    "D06 — PWD / PMGSY / Water-Power Infrastructure (0 removed of 8)": [],
    "D07 — Power Department / DISCOM (3 removed of 10)": [
        "Distribution Transformer Failure Rate (% of installed base)",
        "Solar Rooftop / PM-Surya Ghar Installations Completed (cumulative)",
        "Critical Substation Maintenance Compliance (% schedule met)",
    ],
    "D08 — Police / Law & Order (0 removed of 8)": [],
    "D09 — Agriculture / Allied Livelihoods (4 removed of 10)": [
        "Large Cardamom Acreage Brought Under Cultivation",
        "Mithun Vaccination Coverage",
        "SHGs with Active Bank Credit Line",
        "DDU-GKY Skilling Placements (cumulative)",
    ],
    "D10 — Food & Civil Supplies / Welfare (1 removed of 8)": [
        "DANGUA District Plan Activities On-Schedule",
    ],
    "D11 — Revenue / District Administration (0 removed of 5)": [],
    "D12 — DLR / Transport / Citizen Services (0 removed of 12)": [],
    "D13 — Disaster Management (1 removed of 6)": [
        "VHF/HF Radio Backup Functional at Critical Locations",
    ],
    "D14 — District Governance / DC Office (5 removed of 10)": [
        "Grievances Disposed Within 30 Days",
        "Citizen Satisfaction (random phone sample of closed cases)",
        "Public Dashboard Released On Time (5th of month)",
        "Press Notes / Public Communications Issued",
        "Vacancies in Critical Posts (district total)",
    ],
}

ADDED_NOT_IN_PDF = {
    "KPIs added to dashboard (not in original PDF) — for reference": [
        "D06 — Villages Connected by All-Weather Road (%)",
        "D08 — Night Patrolling Coverage (% beats covered as per plan)",
        "D11 — RTI Replies Disposed Within 30 Days",
    ],
}


def build_pdf(path: str) -> None:
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=30,
        rightMargin=30,
        topMargin=30,
        bottomMargin=30,
    )
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    body_style = styles["BodyText"]
    note_style = styles["Italic"]

    story = []
    story.append(Paragraph("Removed KPIs — Department-wise List", title_style))
    story.append(Spacer(1, 6))
    story.append(
        Paragraph(
            "Compared against <i>KPI_Department_Wise_List.pdf</i> (124 KPIs). "
            "Dashboard seed retains 100 KPIs: 27 removed from PDF + 3 added (not in PDF).",
            note_style,
        )
    )
    story.append(Spacer(1, 14))

    total_removed = 0
    for dept, kpis in REMOVED_KPI_DATA.items():
        story.append(Paragraph(dept, heading_style))
        if kpis:
            total_removed += len(kpis)
            items = [ListItem(Paragraph(kpi, body_style), leftIndent=12) for kpi in kpis]
            story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=16))
        else:
            story.append(Paragraph("No KPIs removed — all PDF indicators retained for this department.", body_style))
        story.append(Spacer(1, 10))

    story.append(Paragraph(f"Total removed from PDF: {total_removed}", heading_style))
    story.append(Spacer(1, 16))

    story.append(Paragraph("Annex — Added to dashboard (not in original PDF)", heading_style))
    story.append(Spacer(1, 6))
    for section, kpis in ADDED_NOT_IN_PDF.items():
        items = [ListItem(Paragraph(kpi, body_style), leftIndent=12) for kpi in kpis]
        story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=16))

    doc.build(story)


if __name__ == "__main__":
    build_pdf(OUTPUT_PATH)
    print(f"PDF created: {OUTPUT_PATH}")
