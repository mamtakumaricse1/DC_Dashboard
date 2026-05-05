-- ==============================
-- RESET DATABASE
-- ==============================


CREATE DATABASE DistrictDB4;
GO

USE DistrictDB4;
GO

-- ==============================
-- TABLES
-- ==============================

CREATE TABLE Departments (
    dept_id VARCHAR(10) PRIMARY KEY,
    name NVARCHAR(100),
    weight DECIMAL(5,2)
);

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(50) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(20),
    dept_id VARCHAR(10),
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE KPIs (
    kpi_id INT PRIMARY KEY IDENTITY(1,1),
    dept_id VARCHAR(10),
    name NVARCHAR(255),
    unit NVARCHAR(50),
    min_value FLOAT,
    max_value FLOAT,
    weight FLOAT,
    polarity VARCHAR(10),
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE PerformanceData (
    id INT PRIMARY KEY IDENTITY(1,1),
    kpi_id INT,
    actual_value FLOAT,
    entry_month INT,
    entry_year INT,
    UNIQUE (kpi_id, entry_month, entry_year),
    FOREIGN KEY (kpi_id) REFERENCES KPIs(kpi_id)
);

-- ==============================
-- DEPARTMENTS (Balanced Weight)
-- ==============================

INSERT INTO Departments (dept_id, name, weight) VALUES
('D01','Health',15.00),
('D02','Education',15.00),
('D03','Agriculture',10.00),
('D04','Public Works',10.00),
('D05','Revenue',10.00),
('D06','Social Welfare',8.00),
('D07','Urban Development',8.00),
('D08','Rural Development',12.00),
('D09','Police',6.00),
('D10','Finance',6.00);

-- ==============================
-- USERS
-- ==============================

INSERT INTO Users (username, password, role, dept_id) VALUES
('admin','admin123','ADMIN',NULL),
('health_user','123','DEPT','D01'),
('edu_user','123','DEPT','D02'),
('agri_user','123','DEPT','D03'),
('pwd_user','123','DEPT','D04'),
('rev_user','123','DEPT','D05'),
('sw_user','123','DEPT','D06'),
('urban_user','123','DEPT','D07'),
('rural_user','123','DEPT','D08'),
('police_user','123','DEPT','D09'),
('finance_user','123','DEPT','D10');

-- ==============================
-- KPIs (5 PER DEPARTMENT)
-- Each KPI weight = 0.2
-- ==============================

-- HEALTH
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D01','Institutional Delivery','%',0,100,0.2,'HIGHER'),
('D01','Full Immunization','%',0,100,0.2,'HIGHER'),
('D01','Maternal Mortality Rate','rate',0,500,0.2,'LOWER'),
('D01','Infant Mortality Rate','rate',0,100,0.2,'LOWER'),
('D01','Doctor Availability','per thousands',0,100,0.2,'HIGHER');

-- EDUCATION
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D02','Enrollment Rate','%',0,100,0.2,'HIGHER'),
('D02','Dropout Rate','%',0,100,0.2,'LOWER'),
('D02','Pass Percentage','%',0,100,0.2,'HIGHER'),
('D02','Teacher Attendance','%',0,100,0.2,'HIGHER'),
('D02','School Infrastructure Score','%',0,100,0.2,'HIGHER');

-- AGRICULTURE
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D03','Crop Yield','kg/ha',0,5000,0.2,'HIGHER'),
('D03','Irrigation Coverage','%',0,100,0.2,'HIGHER'),
('D03','Soil Health Card Coverage','%',0,100,0.2,'HIGHER'),
('D03','Farmer Income Growth','%',0,50,0.2,'HIGHER'),
('D03','Crop Loss','%',0,100,0.2,'LOWER');

-- PUBLIC WORKS
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D04','Road Completion','%',0,100,0.2,'HIGHER'),
('D04','Project Delay','days',0,365,0.2,'LOWER'),
('D04','Bridge Construction','count',0,50,0.2,'HIGHER'),
('D04','Maintenance Score','%',0,100,0.2,'HIGHER'),
('D04','Cost Overrun','%',0,100,0.2,'LOWER');

-- REVENUE
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D05','Revenue Collection','%',0,100,0.2,'HIGHER'),
('D05','Pending Cases','count',0,1000,0.2,'LOWER'),
('D05','Mutation Time','days',0,100,0.2,'LOWER'),
('D05','Land Digitization','%',0,100,0.2,'HIGHER'),
('D05','Tax Compliance','%',0,100,0.2,'HIGHER');

-- SOCIAL WELFARE
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D06','Pension Coverage','%',0,100,0.2,'HIGHER'),
('D06','Scheme Coverage','%',0,100,0.2,'HIGHER'),
('D06','Beneficiary Satisfaction','%',0,100,0.2,'HIGHER'),
('D06','Grievance Resolution','%',0,100,0.2,'HIGHER'),
('D06','Leakages','%',0,100,0.2,'LOWER');

-- URBAN
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D07','Waste Collection','%',0,100,0.2,'HIGHER'),
('D07','Water Supply','%',0,100,0.2,'HIGHER'),
('D07','Sewerage Coverage','%',0,100,0.2,'HIGHER'),
('D07','Air Quality Index','index',0,500,0.2,'LOWER'),
('D07','Urban Roads','%',0,100,0.2,'HIGHER');

-- RURAL
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D08','MGNREGA Employment','days',0,100,0.2,'HIGHER'),
('D08','Rural Roads','%',0,100,0.2,'HIGHER'),
('D08','Toilet Coverage','%',0,100,0.2,'HIGHER'),
('D08','Drinking Water','%',0,100,0.2,'HIGHER'),
('D08','Poverty Rate','%',0,100,0.2,'LOWER');

-- POLICE
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D09','Crime Rate','rate',0,1000,0.2,'LOWER'),
('D09','Case Disposal','%',0,100,0.2,'HIGHER'),
('D09','Response Time','minutes',0,60,0.2,'LOWER'),
('D09','Women Safety Index','%',0,100,0.2,'HIGHER'),
('D09','Conviction Rate','%',0,100,0.2,'HIGHER');

-- FINANCE
INSERT INTO KPIs (dept_id, name, unit, min_value, max_value, weight, polarity) VALUES
('D10','Budget Utilization','%',0,100,0.2,'HIGHER'),
('D10','Audit Compliance','%',0,100,0.2,'HIGHER'),
('D10','Fund Release Delay','days',0,100,0.2,'LOWER'),
('D10','Revenue Growth','%',0,50,0.2,'HIGHER'),
('D10','Expenditure Efficiency','%',0,100,0.2,'HIGHER');

-- ==============================
-- NORMALIZE WEIGHTS (SAFETY)
-- ==============================
UPDATE Departments
SET weight = CASE dept_id
    WHEN 'D01' THEN 15.00
    WHEN 'D02' THEN 15.00
    WHEN 'D03' THEN 10.00
    WHEN 'D04' THEN 10.00
    WHEN 'D05' THEN 10.00
    WHEN 'D06' THEN 8.00
    WHEN 'D07' THEN 8.00
    WHEN 'D08' THEN 12.00
    WHEN 'D09' THEN 6.00
    WHEN 'D10' THEN 6.00
    ELSE 1.00
END;

UPDATE KPIs
SET weight = 0.2
WHERE weight IS NULL OR weight = 0;

-- ==============================
-- CLEAN + SEED LAST 6 MONTHS
-- ==============================
DELETE FROM PerformanceData;

DECLARE @m INT = 0;

WHILE @m < 6
BEGIN
    INSERT INTO PerformanceData (kpi_id, actual_value, entry_month, entry_year)
    SELECT
        k.kpi_id,
        CASE
            WHEN k.polarity = 'HIGHER' THEN
                k.min_value + (k.max_value - k.min_value) *
                (
                    CASE
                        WHEN (base_ratio + variation_ratio) < 0.05 THEN 0.05
                        WHEN (base_ratio + variation_ratio) > 0.95 THEN 0.95
                        ELSE (base_ratio + variation_ratio)
                    END
                )
            ELSE
                k.max_value - (k.max_value - k.min_value) *
                (
                    CASE
                        WHEN (base_ratio + variation_ratio) < 0.05 THEN 0.05
                        WHEN (base_ratio + variation_ratio) > 0.95 THEN 0.95
                        ELSE (base_ratio + variation_ratio)
                    END
                )
        END AS actual_value,
        MONTH(DATEADD(MONTH, -@m, GETDATE())),
        YEAR(DATEADD(MONTH, -@m, GETDATE()))
    FROM (
        SELECT
            k.*,
            -- DEMO-ONLY category spread:
            -- This guarantees that overall departments span all 4 categories,
            -- without permanently hardcoding a specific department as Achiever/Performer/etc.
            CASE ABS(CHECKSUM(k.dept_id)) % 4
                WHEN 0 THEN 0.90  -- Achiever band
                WHEN 1 THEN 0.72  -- Performer band
                WHEN 2 THEN 0.52  -- Aspirant band
                ELSE 0.28         -- Laggard band
            END AS base_ratio,
            -- Month + KPI variation to make sparkline/trend realistic
            (
                ((ABS(CHECKSUM(k.kpi_id, @m, k.dept_id)) % 13) - 6) / 100.0
            ) AS variation_ratio
        FROM KPIs k
    ) k;

    SET @m = @m + 1;
END;

-- ==============================
-- VERIFY
-- ==============================
SELECT COUNT(*) AS Total_Departments FROM Departments; -- 10
SELECT COUNT(*) AS Total_KPIs FROM KPIs;               -- 50
SELECT COUNT(*) AS Total_Performance_Rows FROM PerformanceData; -- 300

SELECT dept_id, name, weight
FROM Departments
ORDER BY dept_id;

SELECT
    MIN(weight) AS MinDeptWeight,
    MAX(weight) AS MaxDeptWeight,
    SUM(weight) AS TotalDeptWeight
FROM Departments;

SELECT TOP 20
    pd.kpi_id, pd.actual_value, pd.entry_month, pd.entry_year
FROM PerformanceData pd
ORDER BY pd.entry_year DESC, pd.entry_month DESC, pd.kpi_id;

-- Quick category preview for current month
SELECT
    d.dept_id,
    d.name,
    ROUND(AVG(
        CASE
            WHEN k.polarity = 'HIGHER'
                THEN ((pd.actual_value - k.min_value) / NULLIF(k.max_value - k.min_value, 0)) * 100
            ELSE ((k.max_value - pd.actual_value) / NULLIF(k.max_value - k.min_value, 0)) * 100
        END
    ), 2) AS dept_score_preview
FROM Departments d
JOIN KPIs k ON d.dept_id = k.dept_id
JOIN PerformanceData pd ON pd.kpi_id = k.kpi_id
WHERE pd.entry_month = MONTH(GETDATE())
  AND pd.entry_year = YEAR(GETDATE())
GROUP BY d.dept_id, d.name
ORDER BY dept_score_preview DESC;
