'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';

export function CatalogSelect({ label, value, onValueChange, options, className }: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return <Select value={value || '__any'} onValueChange={next => onValueChange(next === '__any' ? '' : next)}>
    <SelectTrigger aria-label={label} className={cn('catalog-select', className)}><SelectValue /></SelectTrigger>
    <SelectContent>{options.map(option => <SelectItem key={option.value || '__any'} value={option.value || '__any'}>{option.label}</SelectItem>)}</SelectContent>
  </Select>;
}
