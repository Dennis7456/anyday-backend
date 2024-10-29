"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Role = exports.PaymentStatus = exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["Completed"] = "COMPLETED";
    OrderStatus["InProgress"] = "IN_PROGRESS";
    OrderStatus["Pending"] = "PENDING";
    OrderStatus["Reviewed"] = "REVIEWED";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Completed"] = "COMPLETED";
    PaymentStatus["Failed"] = "FAILED";
    PaymentStatus["Pending"] = "PENDING";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
var Role;
(function (Role) {
    Role["Admin"] = "ADMIN";
    Role["Qa"] = "QA";
    Role["Student"] = "STUDENT";
    Role["Writer"] = "WRITER";
})(Role || (exports.Role = Role = {}));
