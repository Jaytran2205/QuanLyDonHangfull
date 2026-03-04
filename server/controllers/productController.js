import Product from "../models/Product.js";

// Lấy danh sách tất cả sản phẩm
export async function listProducts(req, res) {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// Tạo sản phẩm mới
export async function createProduct(req, res) {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên sản phẩm không được để trống' });
    }

    const product = new Product({
      name: name.trim(),
      description: description || '',
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Sản phẩm này đã tồn tại' });
    }
    res.status(500).json({ error: error.message });
  }
}

// Cập nhật sản phẩm
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      {
        name: name ? name.trim() : undefined,
        description: description !== undefined ? description : undefined,
      },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Sản phẩm không tìm thấy' });
    }

    res.json(product);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Sản phẩm này đã tồn tại' });
    }
    res.status(500).json({ error: error.message });
  }
}

// Xóa sản phẩm
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ error: 'Sản phẩm không tìm thấy' });
    }

    res.json({ message: 'Xóa sản phẩm thành công', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
