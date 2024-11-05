export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Completed"] = "COMPLETED";
    OrderStatus["InProgress"] = "IN_PROGRESS";
    OrderStatus["Pending"] = "PENDING";
    OrderStatus["Reviewed"] = "REVIEWED";
})(OrderStatus || (OrderStatus = {}));
export var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Completed"] = "COMPLETED";
    PaymentStatus["Failed"] = "FAILED";
    PaymentStatus["Pending"] = "PENDING";
})(PaymentStatus || (PaymentStatus = {}));
export var Role;
(function (Role) {
    Role["Admin"] = "ADMIN";
    Role["Qa"] = "QA";
    Role["Student"] = "STUDENT";
    Role["Writer"] = "WRITER";
})(Role || (Role = {}));
