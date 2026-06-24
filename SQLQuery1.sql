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
IF OBJECT_ID('DistrictConfig', 'U') IS NOT NULL DROP TABLE DistrictConfig;
IF OBJECT_ID('DeptMonthlySubmissions', 'U') IS NOT NULL DROP TABLE DeptMonthlySubmissions;
IF OBJECT_ID('ActionItems', 'U') IS NOT NULL DROP TABLE ActionItems;
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
    numerator_value FLOAT NULL,
    denominator_value FLOAT NULL,
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

-- District-level settings (reusable for other districts via district_id)
CREATE TABLE DistrictConfig (
    district_id VARCHAR(30) PRIMARY KEY,
    district_name NVARCHAR(150) NOT NULL,
    state_name NVARCHAR(100) NULL,
    app_title NVARCHAR(200) NOT NULL,
    submission_opens_day TINYINT NOT NULL DEFAULT 1,
    submission_deadline_day TINYINT NOT NULL DEFAULT 1,
    submission_deadline_hour TINYINT NOT NULL DEFAULT 23,
    submission_deadline_minute TINYINT NOT NULL DEFAULT 0,
    target_due_day TINYINT NOT NULL DEFAULT 1,
    target_due_hour TINYINT NOT NULL DEFAULT 12,
    target_due_minute TINYINT NOT NULL DEFAULT 0,
    fiscal_year_start_month TINYINT NOT NULL DEFAULT 4,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);

-- One official KPI submission per department per reporting month
CREATE TABLE DeptMonthlySubmissions (
    dept_id VARCHAR(10) NOT NULL,
    month_key CHAR(7) NOT NULL,
    submitted_by INT NULL,
    submitted_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    is_late BIT NOT NULL DEFAULT 0,
    PRIMARY KEY (dept_id, month_key),
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

-- RED indicators: DC sets target score/plan/date; tracked across months until closed
CREATE TABLE ActionItems (
    action_id INT PRIMARY KEY IDENTITY(1,1),
    dept_id VARCHAR(10) NOT NULL,
    kpi_id VARCHAR(400) NOT NULL,
    month_key CHAR(7) NOT NULL,
    indicator_name NVARCHAR(255) NOT NULL,
    indicator_score FLOAT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'RED',
    action_owner NVARCHAR(150) NULL,
    action_plan NVARCHAR(500) NULL,
    target_score FLOAT NULL,
    target_date DATE NULL,
    completion_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    actual_score FLOAT NULL,
    deviation FLOAT NULL,
    review_month CHAR(7) NULL,
    dc_remarks NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    UNIQUE (kpi_id, month_key),
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

-- ==============================
-- DEPARTMENTS
-- ==============================
-- weight = number of KPIs for that department (each KPI weight = 1; district TPI sums to 100)
INSERT INTO Departments (dept_id, name, weight) VALUES
('D01', 'Health & NHM', 10),
('D02', 'School Education', 8),
('D03', 'ICDS / Women & Child Development', 5),
('D04', 'Social Justice / De-addiction / Youth', 6),
('D05', 'Rural Sanitation / Urban Local Bodies', 5),
('D06', 'PWD / PMGSY / Water-Power Infrastructure', 9),
('D07', 'Power Department / DISCOM', 7),
('D08', 'Police / Law & Order', 9),
('D09', 'Agriculture / Allied Livelihoods', 6),
('D10', 'Food & Civil Supplies / Welfare', 7),
('D11', 'Revenue / District Administration (Judicial-Revenue)', 6),
('D12', 'DLR / Transport / Citizen Services', 12),
('D13', 'Disaster Management', 5),
('D14', 'District Governance / DC Office', 5);

-- ==============================
-- USERS (passwords hashed by scripts/hash-users.js after this SQL runs)
-- Username format: d##_short_name — dept_id is visible in the login name.
-- Password: admin = admin123 | all dept users = 123
-- ==============================
-- | Username              | Dept | Department                          |
-- |-----------------------|------|-------------------------------------|
-- | admin                 | —    | District Commissioner (ADMIN)       |
-- | d01_health_nhm        | D01  | Health & NHM                        |
-- | d02_school_education  | D02  | School Education                    |
-- | d03_icds_wcd          | D03  | ICDS / Women & Child Development    |
-- | d04_social_justice    | D04  | Social Justice / De-addiction       |
-- | d05_sanitation_ulb    | D05  | Rural Sanitation / ULB              |
-- | d06_pwd_infra         | D06  | PWD / PMGSY / Infrastructure        |
-- | d07_power_discom      | D07  | Power Department / DISCOM           |
-- | d08_police            | D08  | Police / Law & Order                |
-- | d09_agriculture       | D09  | Agriculture / Allied Livelihoods    |
-- | d10_food_welfare      | D10  | Food & Civil Supplies / Welfare     |
-- | d11_revenue           | D11  | Revenue / District Administration   |
-- | d12_transport_dlr     | D12  | DLR / Transport / Citizen Services  |
-- | d13_disaster          | D13  | Disaster Management                 |
-- | d14_dc_office         | D14  | District Governance / DC Office       |
-- ==============================
INSERT INTO Users (username, password, role, dept_id) VALUES
('admin', 'admin123', 'ADMIN', NULL),
('d01_health_nhm', '123', 'DEPT', 'D01'),
('d02_school_education', '123', 'DEPT', 'D02'),
('d03_icds_wcd', '123', 'DEPT', 'D03'),
('d04_social_justice', '123', 'DEPT', 'D04'),
('d05_sanitation_ulb', '123', 'DEPT', 'D05'),
('d06_pwd_infra', '123', 'DEPT', 'D06'),
('d07_power_discom', '123', 'DEPT', 'D07'),
('d08_police', '123', 'DEPT', 'D08'),
('d09_agriculture', '123', 'DEPT', 'D09'),
('d10_food_welfare', '123', 'DEPT', 'D10'),
('d11_revenue', '123', 'DEPT', 'D11'),
('d12_transport_dlr', '123', 'DEPT', 'D12'),
('d13_disaster', '123', 'DEPT', 'D13'),
('d14_dc_office', '123', 'DEPT', 'D14');

-- ==============================
-- KPIs + PerformanceData (REQUIRED — not in this SQL file)
-- After running this script you MUST seed or the dashboard will be empty:
--   cd backend
--   npm run seed
-- Or full reset (schema + seed):
--   npm run db:reset
-- ==============================

-- ==============================
-- REPORTING MONTHS (last 6 calendar months for dashboard testing)
-- ==============================
DECLARE @MonthNames TABLE (m INT PRIMARY KEY, label VARCHAR(10));
INSERT INTO @MonthNames (m, label) VALUES
(1, 'Jan'), (2, 'Feb'), (3, 'Mar'), (4, 'Apr'), (5, 'May'), (6, 'Jun'),
(7, 'Jul'), (8, 'Aug'), (9, 'Sep'), (10, 'Oct'), (11, 'Nov'), (12, 'Dec');

DECLARE @ReportingSeed TABLE (
    month_key CHAR(7) NOT NULL,
    month_num TINYINT NOT NULL,
    year_num INT NOT NULL,
    month_name VARCHAR(10) NOT NULL,
    sort_order TINYINT NOT NULL
);

;WITH last6 AS (
    SELECT
        n = v.n,
        dt = DATEADD(MONTH, -(v.n - 1), DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1))
    FROM (VALUES (1), (2), (3), (4), (5), (6)) AS v(n)
)
INSERT INTO @ReportingSeed (month_key, month_num, year_num, month_name, sort_order)
SELECT
    CONCAT(YEAR(dt), '-', RIGHT('0' + CAST(MONTH(dt) AS VARCHAR(2)), 2)),
    MONTH(dt),
    YEAR(dt),
    mn.label,
    7 - n
FROM last6
JOIN @MonthNames mn ON mn.m = MONTH(last6.dt);

INSERT INTO ReportingMonths (month_key, month_num, year_num, month_name, sort_order)
SELECT month_key, month_num, year_num, month_name, sort_order
FROM @ReportingSeed
ORDER BY sort_order;

-- Default Tirap district — copy row and change district_id for another district
INSERT INTO DistrictConfig (
    district_id, district_name, state_name, app_title,
    submission_opens_day, submission_deadline_day, submission_deadline_hour, submission_deadline_minute,
    target_due_day, target_due_hour, target_due_minute, fiscal_year_start_month
) VALUES (
    'tirap', N'Tirap District', N'Arunachal Pradesh', N'Tirap Performance Index',
    1, 1, 23, 0,
    1, 12, 0, 4
);

-- ==============================
-- VERIFY (run seed-100-kpis.js first for KPI / performance counts)
-- ==============================
SELECT COUNT(*) AS Total_Departments FROM Departments;   -- 14
SELECT COUNT(*) AS Total_Users FROM Users;               -- 15
SELECT COUNT(*) AS Total_Months FROM ReportingMonths;    -- 6
