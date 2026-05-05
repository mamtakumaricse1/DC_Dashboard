CREATE TABLE Departments (
    dept_id VARCHAR(10) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    weight DECIMAL(5,2) NOT NULL
);

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20),
    dept_id VARCHAR(10) NULL FOREIGN KEY REFERENCES Departments(dept_id)
);

CREATE TABLE KPIs (
    kpi_id INT PRIMARY KEY IDENTITY(1,1),
    dept_id VARCHAR(10),
    name NVARCHAR(255),
    unit NVARCHAR(50),
    min_value DECIMAL(10,2),
    max_value DECIMAL(10,2),
    weight DECIMAL(5,2),
    polarity VARCHAR(10),
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

CREATE TABLE PerformanceData (
    id INT PRIMARY KEY IDENTITY(1,1),
    kpi_id INT,
    actual_value DECIMAL(10,2),
    entry_month INT,
    entry_year INT,
    CONSTRAINT unique_kpi_month UNIQUE (kpi_id, entry_month, entry_year)
);