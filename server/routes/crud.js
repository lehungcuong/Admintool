import { Router } from 'express';

// Generic CRUD route factory
export function createCrudRoutes(Model, options = {}) {
  const router = Router();

  // GET all
  router.get('/', async (req, res) => {
    try {
      const items = await Model.find().sort({ createdAt: -1 });
      // Chuyển _id thành id cho frontend
      const mapped = items.map(item => {
        const obj = item.toObject();
        obj.id = obj._id.toString();
        delete obj._id;
        delete obj.__v;
        return obj;
      });
      res.json(mapped);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET by id
  router.get('/:id', async (req, res) => {
    try {
      const item = await Model.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
      const obj = item.toObject();
      obj.id = obj._id.toString();
      delete obj._id;
      delete obj.__v;
      res.json(obj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST create
  router.post('/', async (req, res) => {
    try {
      const item = await Model.create(req.body);
      const obj = item.toObject();
      obj.id = obj._id.toString();
      delete obj._id;
      delete obj.__v;
      res.status(201).json(obj);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // POST bulk create
  router.post('/bulk', async (req, res) => {
    try {
      const items = await Model.insertMany(req.body);
      const mapped = items.map(item => {
        const obj = item.toObject();
        obj.id = obj._id.toString();
        delete obj._id;
        delete obj.__v;
        return obj;
      });
      res.status(201).json(mapped);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // PUT update
  router.put('/:id', async (req, res) => {
    try {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
      const obj = item.toObject();
      obj.id = obj._id.toString();
      delete obj._id;
      delete obj.__v;
      res.json(obj);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // DELETE
  router.delete('/:id', async (req, res) => {
    try {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) return res.status(404).json({ error: 'Không tìm thấy' });
      // Run afterDelete callback if provided
      if (options.afterDelete) {
        await options.afterDelete(req.params.id);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
