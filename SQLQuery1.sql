-- ==============================
-- RESET DATABASE
-- ==============================
IF DB_ID('DistrictDB2') IS NOT NULL
    DROP DATABASE DistrictDB2;
GO

CREATE DATABASE DistrictDB2;
GO

USE DistrictDB2;
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
    UNIQUE (kpi_id, entry_month, entry_year)
);

-- ==============================
-- DEPARTMENTS (Balanced Weight)
-- ==============================

INSERT INTO Departments VALUES
('D01','Health',0.15),
('D02','Education',0.15),
('D03','Agriculture',0.10),
('D04','Public Works',0.10),
('D05','Revenue',0.10),
('D06','Social Welfare',0.08),
('D07','Urban Development',0.08),
('D08','Rural Development',0.12),
('D09','Police',0.06),
('D10','Finance',0.06);

-- ==============================
-- USERS
-- ==============================

INSERT INTO Users VALUES
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
INSERT INTO KPIs VALUES
('D01','Institutional Delivery','%',0,100,0.2,'HIGHER'),
('D01','Full Immunization','%',0,100,0.2,'HIGHER'),
('D01','Maternal Mortality Rate','rate',0,500,0.2,'LOWER'),
('D01','Infant Mortality Rate','rate',0,100,0.2,'LOWER'),
('D01','Doctor Availability','per thousands',0,100,0.2,'HIGHER');

-- EDUCATION
INSERT INTO KPIs VALUES
('D02','Enrollment Rate','%',0,100,0.2,'HIGHER'),
('D02','Dropout Rate','%',0,100,0.2,'LOWER'),
('D02','Pass Percentage','%',0,100,0.2,'HIGHER'),
('D02','Teacher Attendance','%',0,100,0.2,'HIGHER'),
('D02','School Infrastructure Score','%',0,100,0.2,'HIGHER');

-- AGRICULTURE
INSERT INTO KPIs VALUES
('D03','Crop Yield','kg/ha',0,5000,0.2,'HIGHER'),
('D03','Irrigation Coverage','%',0,100,0.2,'HIGHER'),
('D03','Soil Health Card Coverage','%',0,100,0.2,'HIGHER'),
('D03','Farmer Income Growth','%',0,50,0.2,'HIGHER'),
('D03','Crop Loss','%',0,100,0.2,'LOWER');

-- PUBLIC WORKS
INSERT INTO KPIs VALUES
('D04','Road Completion','%',0,100,0.2,'HIGHER'),
('D04','Project Delay','days',0,365,0.2,'LOWER'),
('D04','Bridge Construction','count',0,50,0.2,'HIGHER'),
('D04','Maintenance Score','%',0,100,0.2,'HIGHER'),
('D04','Cost Overrun','%',0,100,0.2,'LOWER');

-- REVENUE
INSERT INTO KPIs VALUES
('D05','Revenue Collection','%',0,100,0.2,'HIGHER'),
('D05','Pending Cases','count',0,1000,0.2,'LOWER'),
('D05','Mutation Time','days',0,100,0.2,'LOWER'),
('D05','Land Digitization','%',0,100,0.2,'HIGHER'),
('D05','Tax Compliance','%',0,100,0.2,'HIGHER');

-- SOCIAL WELFARE
INSERT INTO KPIs VALUES
('D06','Pension Coverage','%',0,100,0.2,'HIGHER'),
('D06','Scheme Coverage','%',0,100,0.2,'HIGHER'),
('D06','Beneficiary Satisfaction','%',0,100,0.2,'HIGHER'),
('D06','Grievance Resolution','%',0,100,0.2,'HIGHER'),
('D06','Leakages','%',0,100,0.2,'LOWER');

-- URBAN
INSERT INTO KPIs VALUES
('D07','Waste Collection','%',0,100,0.2,'HIGHER'),
('D07','Water Supply','%',0,100,0.2,'HIGHER'),
('D07','Sewerage Coverage','%',0,100,0.2,'HIGHER'),
('D07','Air Quality Index','index',0,500,0.2,'LOWER'),
('D07','Urban Roads','%',0,100,0.2,'HIGHER');

-- RURAL
INSERT INTO KPIs VALUES
('D08','MGNREGA Employment','days',0,100,0.2,'HIGHER'),
('D08','Rural Roads','%',0,100,0.2,'HIGHER'),
('D08','Toilet Coverage','%',0,100,0.2,'HIGHER'),
('D08','Drinking Water','%',0,100,0.2,'HIGHER'),
('D08','Poverty Rate','%',0,100,0.2,'LOWER');

-- POLICE
INSERT INTO KPIs VALUES
('D09','Crime Rate','rate',0,1000,0.2,'LOWER'),
('D09','Case Disposal','%',0,100,0.2,'HIGHER'),
('D09','Response Time','minutes',0,60,0.2,'LOWER'),
('D09','Women Safety Index','%',0,100,0.2,'HIGHER'),
('D09','Conviction Rate','%',0,100,0.2,'HIGHER');

-- FINANCE
INSERT INTO KPIs VALUES
('D10','Budget Utilization','%',0,100,0.2,'HIGHER'),
('D10','Audit Compliance','%',0,100,0.2,'HIGHER'),
('D10','Fund Release Delay','days',0,100,0.2,'LOWER'),
('D10','Revenue Growth','%',0,50,0.2,'HIGHER'),
('D10','Expenditure Efficiency','%',0,100,0.2,'HIGHER');

-- ==============================
-- DUMMY PERFORMANCE DATA
-- ==============================

DECLARE @m INT = MONTH(GETDATE());
DECLARE @y INT = YEAR(GETDATE());

INSERT INTO PerformanceData (kpi_id, actual_value, entry_month, entry_year)
SELECT kpi_id, 
       ABS(CHECKSUM(NEWID())) % (max_value - min_value + 1) + min_value,
       @m, @y
FROM KPIs;

-- ==============================
-- VERIFY
-- ==============================

SELECT COUNT(*) AS Total_KPIs FROM KPIs; -- should be 50
SELECT * FROM Departments;






-- ==============================
-- CLEAN START (RUN ONCE ONLY)
-- ==============================



DELETE FROM PerformanceData;
GO

DECLARE @m INT = 0;

-- ==============================
-- LAST 6 MONTHS DATA GENERATION
-- ==============================
WHILE @m < 6
BEGIN

    INSERT INTO PerformanceData (kpi_id, actual_value, entry_month, entry_year)
    SELECT 
        k.kpi_id,

        CASE 
            WHEN k.polarity = 'HIGHER' THEN
                k.min_value 
                + (k.max_value - k.min_value)
                * (ABS(CHECKSUM(k.kpi_id, @m)) % 100) / 100.0
            ELSE
                k.max_value 
                - (k.max_value - k.min_value)
                * (ABS(CHECKSUM(k.kpi_id, @m)) % 100) / 100.0
        END AS actual_value,

        MONTH(DATEADD(MONTH, -@m, GETDATE())),
        YEAR(DATEADD(MONTH, -@m, GETDATE()))

    FROM KPIs k;

    SET @m = @m + 1;

END;
