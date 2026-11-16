interface ISupplyController {
  findAll(req: Request, res: Response): Promise<void>;
  findById(req: Request, res: Response): Promise<void>;
  post(req: Request, res: Response): Promise<void>;
  restock(req: Request, res: Response): Promise<void>;
  update(req: Request, res: Response): Promise<void>;
  delete(req: Request, res: Response): Promise<void>;
}

class SupplyController implements ISupplyController {
  findAll = async (req: Request, res: Response): Promise<void> => {
    throw new Error("Method not implemented.");
  };
  findById = async (req: Request, res: Response): Promise<void> => {
    throw new Error("Method not implemented.");
  };
  post = async (req: Request, res: Response): Promise<void> => {
    throw new Error("Method not implemented.");
  };
  restock = async (req: Request, res: Response): Promise<void> => {
    throw new Error("Method not implemented.");
  };
  update = async (req: Request, res: Response): Promise<void> => {
    throw new Error("Method not implemented.");
  };
  delete = async (req: Request, res: Response): Promise<void> => {
    throw new Error("Method not implemented.");
  };
}

export default new SupplyController();
