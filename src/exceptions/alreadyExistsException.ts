class AlreadyExistsException extends Error {
    constructor(msg?: string, options?: ErrorOptions) {
        super(msg, options)
        this.name = new.target.name
    }
}

export default AlreadyExistsException