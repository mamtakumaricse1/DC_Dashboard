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

-- ==============================
-- VERIFY (run seed-100-kpis.js first for KPI / performance counts)
-- ==============================
SELECT COUNT(*) AS Total_Departments FROM Departments;   -- 14
SELECT COUNT(*) AS Total_Users FROM Users;               -- 15
SELECT COUNT(*) AS Total_Months FROM ReportingMonths;    -- 6
