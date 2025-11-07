import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PointsQuery from './PointsQuery';

describe('PointsQuery 页面', () => {
  it('默认渲染不会抛出异常', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const root = createRoot(container);
    const renderComponent = () => {
      act(() => {
        root.render(
          <MemoryRouter initialEntries={['/points-query']}>
            <Routes>
              <Route path="/points-query" element={<PointsQuery />} />
            </Routes>
          </MemoryRouter>
        );
      });
    };

    expect(renderComponent).not.toThrow();
    root.unmount();
    document.body.removeChild(container);
  });
});
