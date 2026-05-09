from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem


OUTPUT_PATH = "D:/DistrictD/KPI_Department_Wise_List.pdf"


KPI_DATA = {
    "Health & NHM": [
        "PHC Functionality Score (% of PHCs scoring >=70% on 6-parameter audit)",
        "Institutional Delivery Rate",
        "Full Immunisation Coverage (children 0-1 yr)",
        "eSanjeevani Tele-OPD Consults per active SC",
        "ANC 4 Visits Completed (% of registered pregnancies)",
        "Ayushman Card Coverage in Priority Villages",
        "Drug Stock-out Days at PHCs (cumulative across district)",
        "OST (Opioid Substitution) Active Patients",
        "De-addiction Centre Treatment Retention (3-month)",
        "TB Case Notification Rate (per lakh population)",
        "Maternal Deaths (this month, district total)",
        "Infant Deaths (this month, district total)",
    ],
    "School Education": [
        "Teacher Attendance Rate (avg across govt schools)",
        "Student Attendance Rate (Classes 1-8)",
        "FLN Reading Proficiency, Class 3 (NIPUN Bharat)",
        "FLN Numeracy Proficiency, Class 3 (NIPUN Bharat)",
        "Schools with Functional Toilets (separate boy/girl)",
        "Schools with Drinking Water",
        "Class 10 Board Pass Rate (annual; reported in March-April)",
        "Class 12 Board Pass Rate (annual)",
        "Out-of-School Children Identified & Mainstreamed",
        "Teacher Training Days Completed (cumulative)",
        "Schools Receiving Mid-Day Meal All Working Days",
        "EMRS / Ashram School Hostel Occupancy",
    ],
    "ICDS / Women & Child Development": [
        "AWC Functionality Score (% scoring >=70% on 5-parameter audit)",
        "Children 0-6 Registered in ICDS MIS",
        "AWCs Running Daily Pre-school Activity",
        "Saksham AWC Upgrade Status (cumulative count)",
        "Take-Home Ration Distribution Coverage",
        "Hot Cooked Meal Days (per AWC per month)",
        "Severely Underweight Children (% of registered 0-6)",
        "Stunting Rate (Class 1 entrants, annual)",
        "AWWs with Smartphone & POSHAN App Active",
    ],
    "Social Justice / De-addiction / Youth": [
        "New Patients Inducted into De-addiction Programme",
        "Recovered Users Placed in Skilling/Employment",
        "Peer Counsellors Active (recovered users)",
        "School-Based Drug Awareness Sessions Conducted",
        "Sports Tournaments at Circle Level Held",
        "Football League Registered Teams",
        "Youth Skilling Enrolments (current month)",
        "NDPS Cases Registered + Disposal Status",
    ],
    "Rural Sanitation / Urban Local Bodies": [
        "ODF-Plus Villages Declared & Sustained (cumulative)",
        "Khonsa Town Door-to-Door Waste Collection Coverage",
        "Public Toilets Functional (% of constructed)",
        "Swachh Tirap Awards Participating Villages",
        "Waste Segregation at Source (% HHs in town)",
        "Drains Cleaned Pre-Monsoon (% of urban drains)",
    ],
    "PWD / PMGSY / Water-Power Infrastructure": [
        "PWD Road Condition (% rated passable, dry season)",
        "PWD Road Condition (% passable, monsoon)",
        "PMGSY Projects On-Schedule (%)",
        "JJM Tap Connections Functional",
        "Villages with 24x7 Power",
        "Mobile Network Coverage (villages with 4G)",
        "Bridges/Culverts Damaged & Awaiting Repair",
        "Power Outage Hours (district total, monthly)",
    ],
    "Power Department / DISCOM": [
        "Average Daily Power Supply Hours (district HQ + circle HQs)",
        "Total Unscheduled Outage Hours (district aggregate, monthly)",
        "Villages with Functional 11kV/LT Connectivity",
        "Households with Metered Connection (RDSS / DDUGJY)",
        "New Service Connection - Mean Days Application to Energization",
        "Billing Efficiency (units billed / units input)",
        "Collection Efficiency (revenue collected / billed)",
        "Distribution Transformer Failure Rate (% of installed base)",
        "Solar Rooftop / PM-Surya Ghar Installations Completed (cumulative)",
        "Critical Substation Maintenance Compliance (% schedule met)",
    ],
    "Police / Law & Order": [
        "FIR Registration Compliance (% of complaints leading to FIR)",
        "Case Disposal Rate (% of pending docket disposed)",
        "NDPS Seizure-to-Treatment Referral Ratio",
        "Crimes Against Women (FIRs registered)",
        "CAW Conviction Rate (% of cases reaching judgment)",
        "Police Public Grievance Days Held (per month, district-wide)",
        "Excise / Opium Field Destruction (acres)",
        "Communal/Tribal Tension Incidents",
    ],
    "Agriculture / Allied Livelihoods": [
        "Farmer Field Demonstration Plots Active",
        "FPOs Active with >100 Members",
        "KCC (Kisan Credit Card) Coverage of Farmers",
        "PM-Kisan Beneficiaries Receiving Installment",
        "Soil Health Cards Distributed (cumulative)",
        "Agarwood Saplings Distributed (cumulative)",
        "Large Cardamom Acreage Brought Under Cultivation",
        "Mithun Vaccination Coverage",
        "SHGs with Active Bank Credit Line",
        "DDU-GKY Skilling Placements (cumulative)",
    ],
    "Food & Civil Supplies / Welfare": [
        "Saturation Villages Where Camp Held (cumulative)",
        "Aadhaar Saturation in Priority Villages",
        "Jan Dhan Account Coverage (adult HHs)",
        "Ration Card Backlog (pending applications)",
        "PMAY-G Houses Sanctioned vs Completed",
        "NSAP Pension Disbursement (% of beneficiaries received)",
        "PM-JANMAN Plan Implementation (% of approved activities executed)",
        "DANGUA District Plan Activities On-Schedule",
    ],
    "Revenue / District Administration (Judicial-Revenue)": [
        "Land Mutation Cases Disposed Within 30 Days",
        "Land Records Digitisation Coverage",
        "Pending Court Cases Involving District (%)",
        "Public Hearing Days (CO + SDO Darbar) Held",
        "Revenue Court Cases Disposed",
    ],
    "DLR / Transport / Citizen Services": [
        "ST Certificate Issued Within 15 Days",
        "PRC Issued Within 15 Days",
        "TRC Issued Within 15 Days",
        "Government ID Card Issued Within 15 Days",
        "ILP Issued Within 7 Days",
        "Driving Licence - Applications Forwarded to DTO Within 3 Working Days",
        "Driving Licence - Applications Received (volume, this month)",
        "Driving Licence - Applications Pending Forwarding (>3 days)",
        "Vehicle Registration - Applications Forwarded to DTO Within 3 Working Days",
        "Vehicle Registration - Applications Received (volume, this month)",
        "Vehicle Registration - Applications Pending Forwarding (>3 days)",
        "Citizen Satisfaction with Jan Suvidha (random phone sample)",
    ],
    "Disaster Management": [
        "Disaster Preparedness Drills Conducted",
        "Pre-Monsoon Stocking at PHCs/Schools (% complete by April)",
        "Villages with Documented DRR Plans",
        "Relief Reached Within 7 Days of Reported Incident",
        "Early Warning System Coverage (flood/landslide-prone villages)",
        "VHF/HF Radio Backup Functional at Critical Locations",
    ],
    "District Governance / DC Office": [
        "DC Field Days Completed",
        "SDO Field Days (avg per SDO)",
        "Officer Tour Diaries Submitted On-Time",
        "GB 360 Feedback Forms Received (quarterly)",
        "Grievances Registered (PGRS-DARPAN + WhatsApp)",
        "Grievances Disposed Within 30 Days",
        "Citizen Satisfaction (random phone sample of closed cases)",
        "Public Dashboard Released On Time (5th of month)",
        "Press Notes / Public Communications Issued",
        "Vacancies in Critical Posts (district total)",
    ],
}


def build_pdf(path: str) -> None:
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=30, rightMargin=30, topMargin=30, bottomMargin=30)
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    body_style = styles["BodyText"]

    story = []
    story.append(Paragraph("Department-wise KPI List", title_style))
    story.append(Spacer(1, 12))

    for dept, kpis in KPI_DATA.items():
        story.append(Paragraph(dept, heading_style))
        items = [ListItem(Paragraph(kpi, body_style), leftIndent=12) for kpi in kpis]
        story.append(ListFlowable(items, bulletType="bullet", start="circle", leftIndent=16))
        story.append(Spacer(1, 10))

    doc.build(story)


if __name__ == "__main__":
    build_pdf(OUTPUT_PATH)
    print(f"PDF created: {OUTPUT_PATH}")
