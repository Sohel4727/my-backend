function ApiResponse(statusCode, data, message = "Success") {
  return {
    statusCode: statusCode,
    data: data,
    message: message,
    success: statusCode < 400,
  };
}

export { ApiResponse };

// we can use class as well

// class ApiResponse {
//     constructor(statusCode, data, message = "Success"){
//         this.statusCode = statusCode
//         this.data = data
//         this.message = message
//         this.success = statusCode < 400
//     }
// }

// export { ApiResponse }
