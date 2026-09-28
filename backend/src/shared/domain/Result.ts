export class Result<T> {
  public isSuccess: boolean;
  public isFailure: boolean;
  private _error: string | null;
  private _value: T | null;

  private constructor(isSuccess: boolean, error?: string | null, value?: T | null) {
    if (isSuccess && error) {
      throw new Error("InvalidOperation: A result cannot be successful and contain an error");
    }
    if (!isSuccess && !error) {
      throw new Error("InvalidOperation: A failing result must contain an error message");
    }

    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._error = error || null;
    this._value = value !== undefined ? value : null;

    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(`Can't get the value of an error result. Error: ${this._error}`);
    }
    return this._value as T;
  }

  public getError(): string {
    if (this.isSuccess) {
      throw new Error("Can't get the error of a success result.");
    }
    return this._error as string;
  }

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, null, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, error, null);
  }

  public static combine(results: Result<any>[]): Result<any> {
    for (const result of results) {
      if (result.isFailure) return result;
    }
    return Result.ok();
  }
}
