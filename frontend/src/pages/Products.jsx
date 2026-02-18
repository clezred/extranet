import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productService, profileService, ASSET_BASE_URL } from '../services/api';
import './Products.css';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', description: '', imageFile: null });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', imageFile: null });
  const createFileRef = useRef(null);
  const editFileRef = useRef(null);
  const navigate = useNavigate();

  const resolveImageUrl = useMemo(() => {
    return (path) => {
      if (!path) return '';
      if (/^https?:\/\//i.test(path)) return path;
      if (path.startsWith('/')) return `${ASSET_BASE_URL}${path}`;
      return path;
    };
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const [profile, list] = await Promise.all([
          profileService.getProfile(),
          productService.list()
        ]);
        setCurrentUserId(profile.id);
        setProducts(list);
      } catch (err) {
        setError('Error loading products');
        if (err.message === 'Authentication required') {
          navigate('/home');
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, imageFile: file }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setEditForm((prev) => ({ ...prev, imageFile: file }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }

    setSaving(true);
    try {
      const created = await productService.create(
        form.name.trim(),
        form.imageFile,
        form.description.trim() || null
      );
      setProducts((prev) => [created, ...prev]);
      setForm({ name: '', description: '', imageFile: null });
      if (createFileRef.current) {
        createFileRef.current.value = '';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name || '',
      description: product.description || '',
      imageFile: null
    });
    if (editFileRef.current) {
      editFileRef.current.value = '';
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', description: '', imageFile: null });
    if (editFileRef.current) {
      editFileRef.current.value = '';
    }
  };

  const handleUpdate = async (productId) => {
    setError('');

    if (!editForm.name.trim()) {
      setError('Product name is required');
      return;
    }

    setSaving(true);
    try {
      await productService.update(
        productId,
        editForm.name.trim(),
        editForm.imageFile,
        editForm.description.trim() || null
      );
      if (editForm.imageFile) {
        const list = await productService.list();
        setProducts(list);
      } else {
        setProducts((prev) => prev.map((item) => {
          if (item.id !== productId) return item;
          return {
            ...item,
            name: editForm.name.trim(),
            description: editForm.description.trim() || null
          };
        }));
      }
      cancelEdit();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    setSaving(true);
    setError('');
    try {
      await productService.remove(productId);
      setProducts((prev) => prev.filter((item) => item.id !== productId));
      if (editingId === productId) {
        cancelEdit();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="products-container">
      <nav className="navbar">
        <Link to="/home" className="btn-back">← Back</Link>
        <h1>Products</h1>
      </nav>

      <div className="products-content">
        {error && <div className="error-message">{error}</div>}

        <form className="product-form" onSubmit={handleCreate}>
          <h2>Create Product</h2>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={form.name}
              onChange={handleChange}
              placeholder="Product name"
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="image">Product image</label>
            <input
              id="image"
              name="image"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={createFileRef}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Short description"
              rows={4}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Create Product'}
          </button>
        </form>

        <section className="products-list">
          <div className="products-header">
            <h2>All Products</h2>
            {loading && <span className="loading">Loading...</span>}
          </div>

          {!loading && products.length === 0 && (
            <div className="empty-state">No products yet.</div>
          )}

          <div className="products-grid">
            {products.map((product) => {
              const isOwner = currentUserId && product.owner_id === currentUserId;
              const imageUrl = resolveImageUrl(product.image_path);
              const isEditing = editingId === product.id;

              return (
                <article className="product-card" key={product.id}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image placeholder">No image</div>
                  )}

                  <div className="product-details">
                    <div className="product-meta">
                      <span className="product-owner">Owner: {product.owner_username || 'Unknown'}</span>
                      <span className="product-date">
                        {product.created_at ? new Date(product.created_at).toLocaleString() : 'Unknown date'}
                      </span>
                    </div>

                    {isEditing ? (
                      <div className="product-edit">
                        <div className="form-group">
                          <label htmlFor={`edit-name-${product.id}`}>Name</label>
                          <input
                            id={`edit-name-${product.id}`}
                            name="name"
                            type="text"
                            value={editForm.name}
                            onChange={handleEditChange}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edit-image-${product.id}`}>Product image</label>
                          <input
                            id={`edit-image-${product.id}`}
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleEditFileChange}
                            ref={editFileRef}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor={`edit-description-${product.id}`}>Description</label>
                          <textarea
                            id={`edit-description-${product.id}`}
                            name="description"
                            rows={3}
                            value={editForm.description}
                            onChange={handleEditChange}
                          />
                        </div>
                        <div className="product-actions">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleUpdate(product.id)}
                            disabled={saving}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={cancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="product-view">
                        <h3>{product.name}</h3>
                        {product.description && <p>{product.description}</p>}
                        {!product.description && <p className="muted">No description.</p>}

                        {isOwner && (
                          <div className="product-actions">
                            <button type="button" className="btn-secondary" onClick={() => startEdit(product)}>
                              Edit
                            </button>
                            <button type="button" className="btn-danger" onClick={() => handleDelete(product.id)}>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
