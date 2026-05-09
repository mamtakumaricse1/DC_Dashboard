-- ==============================
-- RESET DATABASE
-- ==============================
IF DB_ID('DistrictDB4') IS NULL
BEGIN
    CREATE DATABASE DistrictDB4;
END;
GO

USE DistrictDB4;
GO

-- ==============================
-- DROP EXISTING TABLES
-- ==============================
IF OBJECT_ID('PerformanceData', 'U') IS NOT NULL DROP TABLE PerformanceData;
IF OBJECT_ID('ReportingMonths', 'U') IS NOT NULL DROP TABLE ReportingMonths;
IF OBJECT_ID('KPIs', 'U') IS NOT NULL DROP TABLE KPIs;
IF OBJECT_ID('Users', 'U') IS NOT NULL DROP TABLE Users;
IF OBJECT_ID('Departments', 'U') IS NOT NULL DROP TABLE Departments;
GO

-- ==============================
-- TABLES
-- ==============================
CREATE TABLE Departments (
    dept_id VARCHAR(10) PRIMARY KEY,
    name NVARCHAR(150) NOT NULL,
    weight DECIMAL(5,2) NOT NULL
);

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(80) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    dept_id VARCHAR(10) NULL,
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE KPIs (
    -- KPI ID = combination of dept_id + KPI name
    kpi_id VARCHAR(400) PRIMARY KEY,
    dept_id VARCHAR(10) NOT NULL,
    name NVARCHAR(255) NOT NULL,
    unit NVARCHAR(50) NOT NULL DEFAULT 'count',
    min_value FLOAT NOT NULL DEFAULT 0,
    max_value FLOAT NOT NULL DEFAULT 100,
    weight FLOAT NOT NULL DEFAULT 1,
    polarity VARCHAR(10) NOT NULL DEFAULT 'HIGHER',
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE PerformanceData (
    id INT PRIMARY KEY IDENTITY(1,1),
    kpi_id VARCHAR(400) NOT NULL,
    actual_value FLOAT NOT NULL,
    entry_month INT NOT NULL,
    entry_year INT NOT NULL,
    UNIQUE (kpi_id, entry_month, entry_year),
    FOREIGN KEY (kpi_id) REFERENCES KPIs(kpi_id)
);

CREATE TABLE ReportingMonths (
    month_key CHAR(7) PRIMARY KEY,    -- YYYY-MM
    month_num TINYINT NOT NULL,
    year_num INT NOT NULL,
    month_name VARCHAR(10) NOT NULL,
    sort_order TINYINT NOT NULL UNIQUE
);

-- ==============================
-- DEPARTMENTS
-- ==============================
INSERT INTO Departments (dept_id, name, weight) VALUES
('D01', 'Health & NHM', 7.14),
('D02', 'School Education', 7.14),
('D03', 'ICDS / Women & Child Development', 7.14),
('D04', 'Social Justice / De-addiction / Youth', 7.14),
('D05', 'Rural Sanitation / Urban Local Bodies', 7.14),
('D06', 'PWD / PMGSY / Water-Power Infrastructure', 7.14),
('D07', 'Power Department / DISCOM', 7.14),
('D08', 'Police / Law & Order', 7.14),
('D09', 'Agriculture / Allied Livelihoods', 7.14),
('D10', 'Food & Civil Supplies / Welfare', 7.14),
('D11', 'Revenue / District Administration (Judicial-Revenue)', 7.14),
('D12', 'DLR / Transport / Citizen Services', 7.14),
('D13', 'Disaster Management', 7.14),
('D14', 'District Governance / DC Office', 7.18);

-- ==============================
-- USERS (one user per department + admin)
-- ==============================
INSERT INTO Users (username, password, role, dept_id) VALUES
('admin', 'admin123', 'ADMIN', NULL),
('health_user', '123', 'DEPT', 'D01'),
('education_user', '123', 'DEPT', 'D02'),
('icds_user', '123', 'DEPT', 'D03'),
('social_justice_user', '123', 'DEPT', 'D04'),
('sanitation_user', '123', 'DEPT', 'D05'),
('infra_user', '123', 'DEPT', 'D06'),
('power_user', '123', 'DEPT', 'D07'),
('police_user', '123', 'DEPT', 'D08'),
('agri_user', '123', 'DEPT', 'D09'),
('welfare_user', '123', 'DEPT', 'D10'),
('revenue_user', '123', 'DEPT', 'D11'),
('transport_user', '123', 'DEPT', 'D12'),
('disaster_user', '123', 'DEPT', 'D13'),
('dc_office_user', '123', 'DEPT', 'D14');

-- ==============================
-- KPI STAGING DATA (FROM KPI_Department_Wise_List.pdf)
-- ==============================
DECLARE @KpiStaging TABLE (
    dept_id VARCHAR(10),
    kpi_name NVARCHAR(255)
);

INSERT INTO @KpiStaging (dept_id, kpi_name) VALUES
('D01', 'PHC Functionality Score (% of PHCs scoring >=70% on 6-parameter audit)'),
('D01', 'Institutional Delivery Rate'),
('D01', 'Full Immunisation Coverage (children 0-1 yr)'),
('D01', 'eSanjeevani Tele-OPD Consults per active SC'),
('D01', 'ANC 4 Visits Completed (% of registered pregnancies)'),
('D01', 'Ayushman Card Coverage in Priority Villages'),
('D01', 'Drug Stock-out Days at PHCs (cumulative across district)'),
('D01', 'OST (Opioid Substitution) Active Patients'),
('D01', 'De-addiction Centre Treatment Retention (3-month)'),
('D01', 'TB Case Notification Rate (per lakh population)'),
('D01', 'Maternal Deaths (this month, district total)'),
('D01', 'Infant Deaths (this month, district total)'),
('D02', 'Teacher Attendance Rate (avg across govt schools)'),
('D02', 'Student Attendance Rate (Classes 1-8)'),
('D02', 'FLN Reading Proficiency, Class 3 (NIPUN Bharat)'),
('D02', 'FLN Numeracy Proficiency, Class 3 (NIPUN Bharat)'),
('D02', 'Schools with Functional Toilets (separate boy/girl)'),
('D02', 'Schools with Drinking Water'),
('D02', 'Class 10 Board Pass Rate (annual; reported in March-April)'),
('D02', 'Class 12 Board Pass Rate (annual)'),
('D02', 'Out-of-School Children Identified & Mainstreamed'),
('D02', 'Teacher Training Days Completed (cumulative)'),
('D02', 'Schools Receiving Mid-Day Meal All Working Days'),
('D02', 'EMRS / Ashram School Hostel Occupancy'),
('D03', 'AWC Functionality Score (% scoring >=70% on 5-parameter audit)'),
('D03', 'Children 0-6 Registered in ICDS MIS'),
('D03', 'AWCs Running Daily Pre-school Activity'),
('D03', 'Saksham AWC Upgrade Status (cumulative count)'),
('D03', 'Take-Home Ration Distribution Coverage'),
('D03', 'Hot Cooked Meal Days (per AWC per month)'),
('D03', 'Severely Underweight Children (% of registered 0-6)'),
('D03', 'Stunting Rate (Class 1 entrants, annual)'),
('D03', 'AWWs with Smartphone & POSHAN App Active'),
('D04', 'New Patients Inducted into De-addiction Programme'),
('D04', 'Recovered Users Placed in Skilling/Employment'),
('D04', 'Peer Counsellors Active (recovered users)'),
('D04', 'School-Based Drug Awareness Sessions Conducted'),
('D04', 'Sports Tournaments at Circle Level Held'),
('D04', 'Football League Registered Teams'),
('D04', 'Youth Skilling Enrolments (current month)'),
('D04', 'NDPS Cases Registered + Disposal Status'),
('D05', 'ODF-Plus Villages Declared & Sustained (cumulative)'),
('D05', 'Khonsa Town Door-to-Door Waste Collection Coverage'),
('D05', 'Public Toilets Functional (% of constructed)'),
('D05', 'Swachh Tirap Awards Participating Villages'),
('D05', 'Waste Segregation at Source (% HHs in town)'),
('D05', 'Drains Cleaned Pre-Monsoon (% of urban drains)'),
('D06', 'PWD Road Condition (% rated passable, dry season)'),
('D06', 'PWD Road Condition (% passable, monsoon)'),
('D06', 'PMGSY Projects On-Schedule (%)'),
('D06', 'JJM Tap Connections Functional'),
('D06', 'Villages with 24x7 Power'),
('D06', 'Mobile Network Coverage (villages with 4G)'),
('D06', 'Bridges/Culverts Damaged & Awaiting Repair'),
('D06', 'Power Outage Hours (district total, monthly)'),
('D07', 'Average Daily Power Supply Hours (district HQ + circle HQs)'),
('D07', 'Total Unscheduled Outage Hours (district aggregate, monthly)'),
('D07', 'Villages with Functional 11kV/LT Connectivity'),
('D07', 'Households with Metered Connection (RDSS / DDUGJY)'),
('D07', 'New Service Connection - Mean Days Application to Energization'),
('D07', 'Billing Efficiency (units billed / units input)'),
('D07', 'Collection Efficiency (revenue collected / billed)'),
('D07', 'Distribution Transformer Failure Rate (% of installed base)'),
('D07', 'Solar Rooftop / PM-Surya Ghar Installations Completed (cumulative)'),
('D07', 'Critical Substation Maintenance Compliance (% schedule met)'),
('D08', 'FIR Registration Compliance (% of complaints leading to FIR)'),
('D08', 'Case Disposal Rate (% of pending docket disposed)'),
('D08', 'NDPS Seizure-to-Treatment Referral Ratio'),
('D08', 'Crimes Against Women (FIRs registered)'),
('D08', 'CAW Conviction Rate (% of cases reaching judgment)'),
('D08', 'Police Public Grievance Days Held (per month, district-wide)'),
('D08', 'Excise / Opium Field Destruction (acres)'),
('D08', 'Communal/Tribal Tension Incidents'),
('D09', 'Farmer Field Demonstration Plots Active'),
('D09', 'FPOs Active with >100 Members'),
('D09', 'KCC (Kisan Credit Card) Coverage of Farmers'),
('D09', 'PM-Kisan Beneficiaries Receiving Installment'),
('D09', 'Soil Health Cards Distributed (cumulative)'),
('D09', 'Agarwood Saplings Distributed (cumulative)'),
('D09', 'Large Cardamom Acreage Brought Under Cultivation'),
('D09', 'Mithun Vaccination Coverage'),
('D09', 'SHGs with Active Bank Credit Line'),
('D09', 'DDU-GKY Skilling Placements (cumulative)'),
('D10', 'Saturation Villages Where Camp Held (cumulative)'),
('D10', 'Aadhaar Saturation in Priority Villages'),
('D10', 'Jan Dhan Account Coverage (adult HHs)'),
('D10', 'Ration Card Backlog (pending applications)'),
('D10', 'PMAY-G Houses Sanctioned vs Completed'),
('D10', 'NSAP Pension Disbursement (% of beneficiaries received)'),
('D10', 'PM-JANMAN Plan Implementation (% of approved activities executed)'),
('D10', 'DANGUA District Plan Activities On-Schedule'),
('D11', 'Land Mutation Cases Disposed Within 30 Days'),
('D11', 'Land Records Digitisation Coverage'),
('D11', 'Pending Court Cases Involving District (%)'),
('D11', 'Public Hearing Days (CO + SDO Darbar) Held'),
('D11', 'Revenue Court Cases Disposed'),
('D12', 'ST Certificate Issued Within 15 Days'),
('D12', 'PRC Issued Within 15 Days'),
('D12', 'TRC Issued Within 15 Days'),
('D12', 'Government ID Card Issued Within 15 Days'),
('D12', 'ILP Issued Within 7 Days'),
('D12', 'Driving Licence - Applications Forwarded to DTO Within 3 Working Days'),
('D12', 'Driving Licence - Applications Received (volume, this month)'),
('D12', 'Driving Licence - Applications Pending Forwarding (>3 days)'),
('D12', 'Vehicle Registration - Applications Forwarded to DTO Within 3 Working Days'),
('D12', 'Vehicle Registration - Applications Received (volume, this month)'),
('D12', 'Vehicle Registration - Applications Pending Forwarding (>3 days)'),
('D12', 'Citizen Satisfaction with Jan Suvidha (random phone sample)'),
('D13', 'Disaster Preparedness Drills Conducted'),
('D13', 'Pre-Monsoon Stocking at PHCs/Schools (% complete by April)'),
('D13', 'Villages with Documented DRR Plans'),
('D13', 'Relief Reached Within 7 Days of Reported Incident'),
('D13', 'Early Warning System Coverage (flood/landslide-prone villages)'),
('D13', 'VHF/HF Radio Backup Functional at Critical Locations'),
('D14', 'DC Field Days Completed'),
('D14', 'SDO Field Days (avg per SDO)'),
('D14', 'Officer Tour Diaries Submitted On-Time'),
('D14', 'GB 360 Feedback Forms Received (quarterly)'),
('D14', 'Grievances Registered (PGRS-DARPAN + WhatsApp)'),
('D14', 'Grievances Disposed Within 30 Days'),
('D14', 'Citizen Satisfaction (random phone sample of closed cases)'),
('D14', 'Public Dashboard Released On Time (5th of month)'),
('D14', 'Press Notes / Public Communications Issued'),
('D14', 'Vacancies in Critical Posts (district total)');

INSERT INTO KPIs (kpi_id, dept_id, name, unit, min_value, max_value, weight, polarity)
SELECT
    CONCAT(
        dept_id,
        '_',
        REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
            UPPER(kpi_name),
            ' ', '_'
        ), '/', '_'), '-', '_'), '(', ''), ')', ''), '%', 'PCT'), '&', 'AND'), '.', ''), ',', ''), '+', 'PLUS'), '>', ''), '<', ''), '=', '')
    ) AS kpi_id,
    dept_id,
    kpi_name,
    'count',
    0,
    100,
    1,
    'HIGHER'
FROM @KpiStaging;

-- ==============================
-- REPORTING MONTHS (APR -> MAR)
-- ==============================
DECLARE @fyStartYear INT = CASE WHEN MONTH(GETDATE()) >= 4 THEN YEAR(GETDATE()) ELSE YEAR(GETDATE()) - 1 END;

INSERT INTO ReportingMonths (month_key, month_num, year_num, month_name, sort_order) VALUES
(CONCAT(@fyStartYear, '-04'), 4, @fyStartYear, 'Apr', 1),
(CONCAT(@fyStartYear, '-05'), 5, @fyStartYear, 'May', 2),
(CONCAT(@fyStartYear, '-06'), 6, @fyStartYear, 'Jun', 3),
(CONCAT(@fyStartYear, '-07'), 7, @fyStartYear, 'Jul', 4),
(CONCAT(@fyStartYear, '-08'), 8, @fyStartYear, 'Aug', 5),
(CONCAT(@fyStartYear, '-09'), 9, @fyStartYear, 'Sep', 6),
(CONCAT(@fyStartYear, '-10'), 10, @fyStartYear, 'Oct', 7),
(CONCAT(@fyStartYear, '-11'), 11, @fyStartYear, 'Nov', 8),
(CONCAT(@fyStartYear, '-12'), 12, @fyStartYear, 'Dec', 9),
(CONCAT(@fyStartYear + 1, '-01'), 1, @fyStartYear + 1, 'Jan', 10),
(CONCAT(@fyStartYear + 1, '-02'), 2, @fyStartYear + 1, 'Feb', 11),
(CONCAT(@fyStartYear + 1, '-03'), 3, @fyStartYear + 1, 'Mar', 12);

-- ==============================
-- SEED MONTH-WISE DATA FOR ALL KPIs
-- ==============================
INSERT INTO PerformanceData (kpi_id, actual_value, entry_month, entry_year)
SELECT
    k.kpi_id,
    k.min_value + (k.max_value - k.min_value) *
    (
        CASE
            WHEN (0.60 + (((ABS(CHECKSUM(k.kpi_id, rm.month_key, k.dept_id)) % 13) - 6) / 100.0)) < 0.05 THEN 0.05
            WHEN (0.60 + (((ABS(CHECKSUM(k.kpi_id, rm.month_key, k.dept_id)) % 13) - 6) / 100.0)) > 0.95 THEN 0.95
            ELSE (0.60 + (((ABS(CHECKSUM(k.kpi_id, rm.month_key, k.dept_id)) % 13) - 6) / 100.0))
        END
    ) AS actual_value,
    rm.month_num,
    rm.year_num
FROM KPIs k
CROSS JOIN ReportingMonths rm;

-- ==============================
-- VERIFY
-- ==============================
SELECT COUNT(*) AS Total_Departments FROM Departments;      -- 14
SELECT COUNT(*) AS Total_Users FROM Users;                  -- 15
SELECT COUNT(*) AS Total_KPIs FROM KPIs;                    -- 124
SELECT COUNT(*) AS Total_Months FROM ReportingMonths;        -- 12
SELECT COUNT(*) AS Total_Performance_Rows FROM PerformanceData; -- 1488
