import React from 'react';
import {
  Scan,
  Search,
  ShopO,
  OrdersO,
  UserO,
  PointGiftO,
  QuestionO,
  ServiceO,
  InfoO,
  ClockO,
  FireO,
  NewO,
  PhoneO,
  LocationO,
  PhotoFail,
  ArrowLeft
} from '@react-vant/icons';

const iconMap = {
  scan: Scan,
  search: Search,
  'shop-o': ShopO,
  'orders-o': OrdersO,
  'user-o': UserO,
  'point-gift-o': PointGiftO,
  'question-o': QuestionO,
  'service-o': ServiceO,
  'info-o': InfoO,
  'clock-o': ClockO,
  'fire-o': FireO,
  'new-o': NewO,
  'phone-o': PhoneO,
  'location-o': LocationO,
  'photo-fail': PhotoFail,
  'arrow-left': ArrowLeft
};

const normalizeSize = (size) => {
  if (typeof size === 'number') {
    return `${size}px`;
  }
  return size || '24px';
};

const Icon = ({ name, size, color, style, ...rest }) => {
  const Component = iconMap[name];
  if (!Component) {
    console.warn(`Icon "${name}" not found in iconMap`);
    return <span style={{ display: 'inline-block', width: normalizeSize(size), height: normalizeSize(size) }} />;
  }

  const fontSize = normalizeSize(size);

  return (
    <Component
      color={color}
      style={{ fontSize, color, ...style }}
      {...rest}
    />
  );
};

export default Icon;
