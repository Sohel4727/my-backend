function ApiError(
  statusCode,
  message = "Something went wrong",
  errors = [],
  stack = ""
) {
  const apiError = new Error(message);
  apiError.statusCode = statusCode;
  apiError.data = null;
  apiError.message = message;
  apiError.success = false;
  apiError.errors = errors;

  if (stack) {
    apiError.stack = stack;
  } else {
    Error.captureStackTrace(apiError, ApiError);
  }

  return apiError;
}

export { ApiError };

/*
// we can use class as well

class ApiError extends Error {
    constructor(
        statusCode,
        message= "Something went wrong",
        errors = [],
        stack = ""
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor)
        }

    }
}
export { ApiError };
*/

