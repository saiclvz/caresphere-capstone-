IF DB_ID(N'CareSphere') IS NULL
    CREATE DATABASE CareSphere;
GO

USE CareSphere;
GO

IF OBJECT_ID(N'dbo.Activity_Logs', N'U') IS NOT NULL DROP TABLE dbo.Activity_Logs;
IF OBJECT_ID(N'dbo.Meal_Deliveries', N'U') IS NOT NULL DROP TABLE dbo.Meal_Deliveries;
IF OBJECT_ID(N'dbo.Staff_Shifts', N'U') IS NOT NULL DROP TABLE dbo.Staff_Shifts;
IF OBJECT_ID(N'dbo.Visitor_Logs', N'U') IS NOT NULL DROP TABLE dbo.Visitor_Logs;
IF OBJECT_ID(N'dbo.Donation_Receipts', N'U') IS NOT NULL DROP TABLE dbo.Donation_Receipts;
IF OBJECT_ID(N'dbo.Health_Documents', N'U') IS NOT NULL DROP TABLE dbo.Health_Documents;
IF OBJECT_ID(N'dbo.Care_Notes', N'U') IS NOT NULL DROP TABLE dbo.Care_Notes;
IF OBJECT_ID(N'dbo.Dental_Records', N'U') IS NOT NULL DROP TABLE dbo.Dental_Records;
IF OBJECT_ID(N'dbo.Emergency_Records', N'U') IS NOT NULL DROP TABLE dbo.Emergency_Records;
IF OBJECT_ID(N'dbo.Growth_Records', N'U') IS NOT NULL DROP TABLE dbo.Growth_Records;
IF OBJECT_ID(N'dbo.Immunizations', N'U') IS NOT NULL DROP TABLE dbo.Immunizations;
IF OBJECT_ID(N'dbo.Medications', N'U') IS NOT NULL DROP TABLE dbo.Medications;
IF OBJECT_ID(N'dbo.Medical_Visits', N'U') IS NOT NULL DROP TABLE dbo.Medical_Visits;
IF OBJECT_ID(N'dbo.Sessions', N'U') IS NOT NULL DROP TABLE dbo.Sessions;
IF OBJECT_ID(N'dbo.Role_Permissions', N'U') IS NOT NULL DROP TABLE dbo.Role_Permissions;
IF OBJECT_ID(N'dbo.Permissions', N'U') IS NOT NULL DROP TABLE dbo.Permissions;
IF OBJECT_ID(N'dbo.QR_Tokens', N'U') IS NOT NULL DROP TABLE dbo.QR_Tokens;
IF OBJECT_ID(N'dbo.Inventory_Transactions', N'U') IS NOT NULL DROP TABLE dbo.Inventory_Transactions;
IF OBJECT_ID(N'dbo.Donations', N'U') IS NOT NULL DROP TABLE dbo.Donations;
IF OBJECT_ID(N'dbo.Inventory_Items', N'U') IS NOT NULL DROP TABLE dbo.Inventory_Items;
IF OBJECT_ID(N'dbo.Child_Health_Profile', N'U') IS NOT NULL DROP TABLE dbo.Child_Health_Profile;
IF OBJECT_ID(N'dbo.Children', N'U') IS NOT NULL DROP TABLE dbo.Children;
IF OBJECT_ID(N'dbo.User_Roles', N'U') IS NOT NULL DROP TABLE dbo.User_Roles;
IF OBJECT_ID(N'dbo.Users', N'U') IS NOT NULL DROP TABLE dbo.Users;
IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL DROP TABLE dbo.Roles;
GO

CREATE TABLE dbo.Roles (
    RoleId INT IDENTITY(1,1) CONSTRAINT PK_Roles PRIMARY KEY,
    RoleName NVARCHAR(40) NOT NULL CONSTRAINT UQ_Roles_RoleName UNIQUE,
    Description NVARCHAR(255) NULL
);

CREATE TABLE dbo.Permissions (
    PermissionId INT IDENTITY(1,1) CONSTRAINT PK_Permissions PRIMARY KEY,
    PermissionCode NVARCHAR(80) NOT NULL CONSTRAINT UQ_Permissions_Code UNIQUE,
    Description NVARCHAR(255) NULL
);

CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
    FullName NVARCHAR(120) NOT NULL,
    Username NVARCHAR(80) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
    Email NVARCHAR(160) NULL CONSTRAINT UQ_Users_Email UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    MfaEnabled BIT NOT NULL CONSTRAINT DF_Users_MfaEnabled DEFAULT 0,
    MfaCodeHash NVARCHAR(255) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.User_Roles (
    UserId INT NOT NULL,
    RoleId INT NOT NULL,
    CONSTRAINT PK_User_Roles PRIMARY KEY (UserId, RoleId),
    CONSTRAINT FK_User_Roles_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE,
    CONSTRAINT FK_User_Roles_Role FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId) ON DELETE NO ACTION
);

CREATE TABLE dbo.Role_Permissions (
    RoleId INT NOT NULL,
    PermissionId INT NOT NULL,
    CONSTRAINT PK_Role_Permissions PRIMARY KEY (RoleId, PermissionId),
    CONSTRAINT FK_Role_Permissions_Role FOREIGN KEY (RoleId) REFERENCES dbo.Roles(RoleId) ON DELETE CASCADE,
    CONSTRAINT FK_Role_Permissions_Permission FOREIGN KEY (PermissionId) REFERENCES dbo.Permissions(PermissionId) ON DELETE CASCADE
);

CREATE TABLE dbo.Sessions (
    SessionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Sessions PRIMARY KEY DEFAULT NEWSEQUENTIALID(),
    UserId INT NOT NULL,
    TokenHash CHAR(64) NOT NULL CONSTRAINT UQ_Sessions_TokenHash UNIQUE,
    ExpiresAt DATETIME2(0) NOT NULL,
    RevokedAt DATETIME2(0) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Sessions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Sessions_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE CASCADE
);

CREATE TABLE dbo.Children (
    ChildId INT IDENTITY(1,1) CONSTRAINT PK_Children PRIMARY KEY,
    ChildCode NVARCHAR(40) NOT NULL CONSTRAINT UQ_Children_ChildCode UNIQUE,
    FirstName NVARCHAR(80) NOT NULL,
    LastName NVARCHAR(80) NOT NULL,
    BirthDate DATE NULL,
    Gender NVARCHAR(30) NULL,
    PhotoUrl NVARCHAR(500) NULL,
    Room NVARCHAR(80) NULL,
    Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Children_Status DEFAULT N'Active',
    AdmissionDate DATE NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Children_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Children_UpdatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Child_Health_Profile (
    HealthProfileId INT IDENTITY(1,1) CONSTRAINT PK_Health_Profiles PRIMARY KEY,
    ChildId INT NOT NULL CONSTRAINT UQ_Health_Profiles_Child UNIQUE,
    BloodType NVARCHAR(10) NULL,
    Allergies NVARCHAR(1000) NULL,
    Conditions NVARCHAR(1000) NULL,
    Medications NVARCHAR(1000) NULL,
    LastCheckupDate DATE NULL,
    Notes NVARCHAR(2000) NULL,
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Child_Health_Profile_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Child_Health_Profile_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Medical_Visits (
    MedicalVisitId BIGINT IDENTITY(1,1) CONSTRAINT PK_Medical_Visits PRIMARY KEY,
    ChildId INT NOT NULL, VisitDate DATE NOT NULL, Provider NVARCHAR(160) NULL,
    Diagnosis NVARCHAR(1000) NULL, Notes NVARCHAR(2000) NULL,
    CONSTRAINT FK_Medical_Visits_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Medications (
    MedicationId BIGINT IDENTITY(1,1) CONSTRAINT PK_Medications PRIMARY KEY,
    ChildId INT NOT NULL, MedicationName NVARCHAR(160) NOT NULL, Dosage NVARCHAR(120) NULL,
    Frequency NVARCHAR(120) NULL, StartDate DATE NULL, EndDate DATE NULL, Notes NVARCHAR(1000) NULL,
    CONSTRAINT FK_Medications_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Immunizations (
    ImmunizationId BIGINT IDENTITY(1,1) CONSTRAINT PK_Immunizations PRIMARY KEY,
    ChildId INT NOT NULL, VaccineName NVARCHAR(160) NOT NULL, DoseNumber INT NULL,
    AdministeredDate DATE NULL, Provider NVARCHAR(160) NULL,
    CONSTRAINT FK_Immunizations_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Growth_Records (
    GrowthRecordId BIGINT IDENTITY(1,1) CONSTRAINT PK_Growth_Records PRIMARY KEY,
    ChildId INT NOT NULL, RecordedDate DATE NOT NULL, HeightCm DECIMAL(6,2) NULL, WeightKg DECIMAL(6,2) NULL,
    Notes NVARCHAR(1000) NULL, CONSTRAINT FK_Growth_Records_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Dental_Records (
    DentalRecordId BIGINT IDENTITY(1,1) CONSTRAINT PK_Dental_Records PRIMARY KEY,
    ChildId INT NOT NULL, VisitDate DATE NOT NULL, Provider NVARCHAR(160) NULL,
    Findings NVARCHAR(1000) NULL, Treatment NVARCHAR(1000) NULL,
    CONSTRAINT FK_Dental_Records_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Emergency_Records (
    EmergencyRecordId BIGINT IDENTITY(1,1) CONSTRAINT PK_Emergency_Records PRIMARY KEY,
    ChildId INT NOT NULL, ContactName NVARCHAR(160) NOT NULL, Relationship NVARCHAR(80) NULL,
    Phone NVARCHAR(40) NULL, Address NVARCHAR(500) NULL, IsPrimary BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Emergency_Records_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE
);

CREATE TABLE dbo.Health_Documents (
    HealthDocumentId BIGINT IDENTITY(1,1) CONSTRAINT PK_Health_Documents PRIMARY KEY,
    ChildId INT NOT NULL, DocumentName NVARCHAR(255) NOT NULL, StorageUrl NVARCHAR(1000) NOT NULL,
    UploadedBy INT NULL, UploadedAt DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Health_Documents_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE,
    CONSTRAINT FK_Health_Documents_User FOREIGN KEY (UploadedBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);

CREATE TABLE dbo.Care_Notes (
    CareNoteId BIGINT IDENTITY(1,1) CONSTRAINT PK_Care_Notes PRIMARY KEY,
    ChildId INT NOT NULL, NoteText NVARCHAR(2000) NOT NULL,
    CreatedBy INT NULL, CreatedAt DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Care_Notes_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE,
    CONSTRAINT FK_Care_Notes_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);

CREATE TABLE dbo.Inventory_Items (
    InventoryItemId INT IDENTITY(1,1) CONSTRAINT PK_Inventory_Items PRIMARY KEY,
    ItemCode NVARCHAR(40) NOT NULL CONSTRAINT UQ_Inventory_Items_ItemCode UNIQUE,
    ItemName NVARCHAR(120) NOT NULL,
    Category NVARCHAR(60) NOT NULL,
    Quantity DECIMAL(12,2) NOT NULL CONSTRAINT DF_Inventory_Items_Quantity DEFAULT 0,
    Unit NVARCHAR(30) NOT NULL CONSTRAINT DF_Inventory_Items_Unit DEFAULT N'pcs',
    LowStockThreshold DECIMAL(12,2) NOT NULL CONSTRAINT DF_Inventory_Items_LowStock DEFAULT 5,
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Inventory_Items_UpdatedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Inventory_Transactions (
    InventoryTransactionId BIGINT IDENTITY(1,1) CONSTRAINT PK_Inventory_Transactions PRIMARY KEY,
    InventoryItemId INT NOT NULL,
    UserId INT NULL,
    QuantityChange DECIMAL(12,2) NOT NULL,
    Reason NVARCHAR(255) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Inventory_Transactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Inventory_Transactions_Item FOREIGN KEY (InventoryItemId) REFERENCES dbo.Inventory_Items(InventoryItemId) ON DELETE CASCADE,
    CONSTRAINT FK_Inventory_Transactions_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);

CREATE TABLE dbo.Donations (
    DonationId INT IDENTITY(1,1) CONSTRAINT PK_Donations PRIMARY KEY,
    DonorName NVARCHAR(160) NOT NULL,
    Amount DECIMAL(12,2) NOT NULL CONSTRAINT DF_Donations_Amount DEFAULT 0,
    Category NVARCHAR(80) NULL,
    ReceivedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Donations_ReceivedAt DEFAULT SYSUTCDATETIME()
);

CREATE TABLE dbo.Donation_Receipts (
    DonationReceiptId BIGINT IDENTITY(1,1) CONSTRAINT PK_Donation_Receipts PRIMARY KEY,
    DonationId INT NOT NULL,
    ReceiptTokenHash CHAR(64) NOT NULL CONSTRAINT UQ_Donation_Receipts_TokenHash UNIQUE,
    CreatedAt DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Donation_Receipts_Donation FOREIGN KEY (DonationId) REFERENCES dbo.Donations(DonationId) ON DELETE CASCADE
);

CREATE TABLE dbo.Visitor_Logs (
    VisitorLogId BIGINT IDENTITY(1,1) CONSTRAINT PK_Visitor_Logs PRIMARY KEY,
    VisitorName NVARCHAR(160) NOT NULL, Purpose NVARCHAR(255) NULL,
    CheckInAt DATETIME2(0) NOT NULL DEFAULT SYSUTCDATETIME(), CheckOutAt DATETIME2(0) NULL,
    CheckInTokenHash CHAR(64) NULL, CreatedBy INT NULL,
    CONSTRAINT FK_Visitor_Logs_User FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);

CREATE TABLE dbo.Staff_Shifts (
    StaffShiftId BIGINT IDENTITY(1,1) CONSTRAINT PK_Staff_Shifts PRIMARY KEY,
    UserId INT NOT NULL, ShiftDate DATE NOT NULL, StartTime TIME NOT NULL, EndTime TIME NOT NULL,
    Status NVARCHAR(30) NOT NULL DEFAULT N'Scheduled',
    CONSTRAINT FK_Staff_Shifts_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE NO ACTION
);

CREATE TABLE dbo.Meal_Deliveries (
    MealDeliveryId BIGINT IDENTITY(1,1) CONSTRAINT PK_Meal_Deliveries PRIMARY KEY,
    DeliveryDate DATE NOT NULL, MealType NVARCHAR(30) NOT NULL, Menu NVARCHAR(500) NOT NULL,
    Quantity INT NULL, DeliveredBy INT NULL, DeliveredAt DATETIME2(0) NULL,
    CONSTRAINT FK_Meal_Deliveries_User FOREIGN KEY (DeliveredBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);

CREATE TABLE dbo.QR_Tokens (
    QRTokenId BIGINT IDENTITY(1,1) CONSTRAINT PK_QR_Tokens PRIMARY KEY,
    ChildId INT NOT NULL,
    TokenHash CHAR(64) NOT NULL CONSTRAINT UQ_QR_Tokens_TokenHash UNIQUE,
    ExpiresAt DATETIME2(0) NOT NULL,
    RevokedAt DATETIME2(0) NULL,
    CreatedBy INT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_QR_Tokens_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_QR_Tokens_Child FOREIGN KEY (ChildId) REFERENCES dbo.Children(ChildId) ON DELETE CASCADE,
    CONSTRAINT FK_QR_Tokens_CreatedBy FOREIGN KEY (CreatedBy) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);

CREATE TABLE dbo.Activity_Logs (
    ActivityLogId BIGINT IDENTITY(1,1) CONSTRAINT PK_Activity_Logs PRIMARY KEY,
    UserId INT NULL,
    Action NVARCHAR(120) NOT NULL,
    Entity NVARCHAR(80) NULL,
    EntityId NVARCHAR(80) NULL,
    Details NVARCHAR(MAX) NULL,
    IPAddress NVARCHAR(64) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Activity_Logs_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_Activity_Logs_User FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId) ON DELETE SET NULL
);
GO

CREATE TRIGGER dbo.TR_Activity_Logs_Immutable
ON dbo.Activity_Logs
AFTER UPDATE, DELETE
AS
BEGIN
    THROW 51000, 'Activity_Logs is immutable.', 1;
END;
GO

CREATE INDEX IX_Children_Status ON dbo.Children(Status, LastName, FirstName);
CREATE INDEX IX_Child_Health_Profile_ChildId ON dbo.Child_Health_Profile(ChildId);
CREATE INDEX IX_Inventory_Items_LowStock ON dbo.Inventory_Items(Quantity, LowStockThreshold);
CREATE INDEX IX_Inventory_Transactions_ItemDate ON dbo.Inventory_Transactions(InventoryItemId, CreatedAt DESC);
CREATE INDEX IX_QR_Tokens_Expiry ON dbo.QR_Tokens(TokenHash, ExpiresAt);
CREATE INDEX IX_QR_Tokens_Active ON dbo.QR_Tokens(ChildId, ExpiresAt, RevokedAt);
CREATE INDEX IX_Activity_Logs_Date ON dbo.Activity_Logs(CreatedAt DESC);
CREATE INDEX IX_Sessions_Active ON dbo.Sessions(UserId, ExpiresAt, RevokedAt);
CREATE INDEX IX_Visitor_Logs_CheckIn ON dbo.Visitor_Logs(CheckInAt DESC);
CREATE INDEX IX_Staff_Shifts_Date ON dbo.Staff_Shifts(ShiftDate, UserId);
CREATE INDEX IX_Medical_Visits_ChildDate ON dbo.Medical_Visits(ChildId, VisitDate DESC);
CREATE INDEX IX_Medications_Child ON dbo.Medications(ChildId, StartDate DESC);
GO

INSERT INTO dbo.Roles (RoleName, Description) VALUES
(N'ADMIN', N'Full system access'),
(N'STAFF', N'Child and inventory operations'),
(N'HEALTH', N'Health profile access'),
(N'VIEWER', N'Read-only access'),
(N'VISITOR', N'Visitor check-in access'),
(N'DONOR', N'Donation receipt access');

INSERT INTO dbo.Permissions (PermissionCode, Description) VALUES
(N'VIEW_DASHBOARD', N'View operational dashboard'),
(N'VIEW_CHILDREN', N'View child profiles'),
(N'EDIT_CHILDREN', N'Create and edit child profiles'),
(N'VIEW_INVENTORY', N'View inventory'),
(N'CHECK_IN_VISITOR', N'Check visitors in and out'),
(N'MANAGE_SHIFTS', N'Manage staff duty shifts'),
(N'LOG_MEALS', N'Log weekly meal deliveries'),
(N'MANAGE_DONATIONS', N'Log donations and receipts'),
(N'VIEW_HEALTH_RECORD', N'View child health records'),
(N'ADD_HEALTH_RECORD', N'Add child health records'),
(N'EDIT_HEALTH_RECORD', N'Edit child health records'),
(N'VIEW_MEDICAL_DOCUMENT', N'View protected health documents'),
(N'MANAGE_HEALTH_RECORD', N'Manage complete health history'),
(N'GENERATE_QR', N'Generate protected child QR codes'),
(N'RESOLVE_QR', N'Resolve an approved protected QR token'),
(N'VIEW_AUDIT_LOGS', N'View immutable activity logs'),
(N'MANAGE_INVENTORY', N'Manage stock and inventory transactions');

INSERT INTO dbo.Role_Permissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.RoleName = N'ADMIN';

INSERT INTO dbo.Role_Permissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.RoleName = N'STAFF' AND p.PermissionCode IN (N'VIEW_DASHBOARD', N'VIEW_CHILDREN', N'EDIT_CHILDREN', N'VIEW_HEALTH_RECORD', N'ADD_HEALTH_RECORD', N'GENERATE_QR', N'VIEW_INVENTORY', N'MANAGE_INVENTORY', N'CHECK_IN_VISITOR', N'LOG_MEALS');

INSERT INTO dbo.Role_Permissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.RoleName = N'HEALTH' AND p.PermissionCode IN (N'VIEW_DASHBOARD', N'VIEW_CHILDREN', N'VIEW_HEALTH_RECORD', N'ADD_HEALTH_RECORD', N'EDIT_HEALTH_RECORD', N'VIEW_MEDICAL_DOCUMENT', N'MANAGE_HEALTH_RECORD');

INSERT INTO dbo.Role_Permissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.RoleName = N'VIEWER' AND p.PermissionCode IN (N'VIEW_DASHBOARD', N'VIEW_CHILDREN', N'VIEW_HEALTH_RECORD');

INSERT INTO dbo.Role_Permissions (RoleId, PermissionId)
SELECT r.RoleId, p.PermissionId
FROM dbo.Roles r CROSS JOIN dbo.Permissions p
WHERE r.RoleName IN (N'VISITOR', N'DONOR') AND p.PermissionCode = N'RESOLVE_QR';

INSERT INTO dbo.Users (FullName, Username, Email, PasswordHash, MfaEnabled, MfaCodeHash)
VALUES (N'System Administrator', N'admin', N'admin@caresphere.local', N'$2b$10$ghlXPwYPU/MueAIwvelW5e/oiJmxtYq2zZA0libk7vG4jwEJLpHkG', 1, N'$2a$10$zSiHYqJfa4oBh14GXSN2L.gKFSNbh6FNI3Jit7jioIrfQiImuZnOG');

INSERT INTO dbo.User_Roles (UserId, RoleId)
SELECT u.UserId, r.RoleId FROM dbo.Users u CROSS JOIN dbo.Roles r WHERE u.Username = N'admin' AND r.RoleName = N'ADMIN';

INSERT INTO dbo.Children (ChildCode, FirstName, LastName, BirthDate, Gender, Room, AdmissionDate)
VALUES
(N'CS-2091', N'Ana', N'D.', '2017-04-14', N'Female', N'Room 4', '2023-06-02'),
(N'CS-2088', N'Miguel', N'R.', '2014-11-02', N'Male', N'Room 2', '2022-01-18'),
(N'CS-2075', N'Liza', N'T.', '2019-02-27', N'Female', N'Room 1', '2024-08-09');

INSERT INTO dbo.Inventory_Items (ItemCode, ItemName, Category, Quantity, Unit, LowStockThreshold)
VALUES
(N'INV-RICE', N'Rice', N'Food', 48, N'kg', 20),
(N'INV-MILK', N'Powdered Milk', N'Food', 6, N'cans', 10),
(N'INV-FIRSTAID', N'First Aid Kits', N'Medical', 3, N'kits', 5);
GO
