import React, { useState, useEffect } from 'react';
import { NavBar, Search, Tabs, Card, Tag, Image, Empty, PullRefresh, List } from 'react-vant';
import { useNavigate } from 'react-router-dom';
import { productAPI, utils } from '../services/api';
import Icon from '../components/Icon';

const Shop = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finished, setFinished] = useState(false);
  const [page, setPage] = useState(1);

  const categories = [
    { key: 'all', name: '全部' },
    { key: '热门商品', name: '热门商品' },
    { key: '最新商品', name: '最新商品' },
    { key: '周边', name: '周边' },
    { key: '实物', name: '实物' },
    { key: '优惠券', name: '优惠券' }
  ];

  useEffect(() => {
    loadProducts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, searchValue]);

  const loadProducts = async (reset = false) => {
    if (loading) return;

    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;

      const params = {
        page: currentPage,
        pageSize: 10,
        category: activeTab === 'all' ? undefined : activeTab,
        keyword: searchValue || undefined
      };

      const response = await productAPI.getList(params);
      const newProducts = response.data.list || [];

      if (reset) {
        setProducts(newProducts);
        setPage(2);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
        setPage(prev => prev + 1);
      }

      setFinished(newProducts.length < params.pageSize);
    } catch (error) {
      console.error('获取商品失败:', error);
      if (reset) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setFinished(false);
    setPage(1);
    await loadProducts(true);
  };

  const handleLoadMore = async () => {
    if (loading || finished) return;
    await loadProducts(false);
  };

  const handleSearch = (value) => {
    setSearchValue(value);
    setPage(1);
  };

  const handleProductClick = (product) => {
    navigate(`/product/${product.id}`);
  };

  const ProductCard = ({ product }) => (
    <Card
      className="product-card"
      onClick={() => handleProductClick(product)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ position: 'relative' }}>
        <Image
          src={utils.buildImageUrl(product.image_url)}
          alt={product.name}
          width="100%"
          height="200px"
          fit="cover"
          lazyload
          errorIcon={<Icon name="shop-o" />}
        />

        {/* 商品标签 */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          display: 'flex',
          gap: '4px'
        }}>
          {product.is_hot && (
            <Tag color="#FF3B30" size="small">
              <Icon name="fire-o" style={{ marginRight: '2px' }} />
              热销
            </Tag>
          )}
          {product.is_new && (
            <Tag color="#FF9500" size="small">
              <Icon name="new-o" style={{ marginRight: '2px' }} />
              新品
            </Tag>
          )}
        </div>

        {/* 库存状态 */}
        {product.stock === 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            暂时缺货
          </div>
        )}
      </div>

      <div className="product-info">
        <div className="product-name">{product.name}</div>

        {product.description && (
          <div className="product-desc">{product.description}</div>
        )}

        <div className="product-footer">
          <div>
            <span className="product-price">
              {utils.formatNumber(product.points_required)}积分
            </span>
            {product.original_price && (
              <span className="product-original-price">
                ￥{product.original_price}
              </span>
            )}
          </div>

          <div style={{ fontSize: '12px', color: '#969799' }}>
            {product.stock === -1 ? '无限库存' : `库存${product.stock}`}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="page-container">
      <NavBar
        title="积分商城"
        fixed
        placeholder
      />

      <div style={{ background: '#fff', padding: '12px 16px' }}>
        <Search
          value={searchValue}
          onChange={setSearchValue}
          onSearch={handleSearch}
          placeholder="搜索商品"
          shape="round"
        />
      </div>

      <Tabs
        active={activeTab}
        onChange={setActiveTab}
        sticky
        offsetTop={46}
        swipeThreshold={4}
      >
        {categories.map(category => (
          <Tabs.TabPane key={category.key} title={category.name} name={category.key}>
            <div style={{ padding: '0 16px' }}>
              <PullRefresh onRefresh={handleRefresh}>
                <List
                  loading={loading}
                  finished={finished}
                  onLoad={handleLoadMore}
                  finishedText="没有更多商品了"
                  loadingText="加载中..."
                >
                  {products.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '12px',
                      paddingTop: '12px'
                    }}>
                      {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : !loading ? (
                    <div style={{ paddingTop: '60px' }}>
                      <Empty
                        description={searchValue ? '未找到相关商品' : '暂无商品'}
                        imageSize={80}
                      />
                    </div>
                  ) : null}
                </List>
              </PullRefresh>
            </div>
          </Tabs.TabPane>
        ))}
      </Tabs>

      {/* 底部预留空间 */}
      <div style={{ height: '20px' }} />
    </div>
  );
};

export default Shop;
