import React from 'react';

// Type for the HTML content returned by renderHtmlContent
interface HtmlContent {
  __html: string;
}

// Function to safely render HTML content with clickable links
export const renderHtmlContent = (html: string): HtmlContent => {
  // Check if we're in a browser environment
  if (typeof document === 'undefined') {
    return { __html: html };
  }

  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Find all anchor tags and make them open in a new tab
  const links = tempDiv.getElementsByTagName('a');
  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    if (link) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  }
  
  // Return the sanitized HTML
  return { __html: tempDiv.innerHTML };
};

// Component that uses the renderHtmlContent function
interface SafeHtmlContentProps {
  html: string;
  className?: string;
  maxHeight?: string;
}

export const SafeHtmlContent: React.FC<SafeHtmlContentProps> = ({ 
  html, 
  className = 'text-[#c9c9d1] whitespace-pre-wrap',
  maxHeight = 'max-h-48'
}) => {
  if (!html) return null;
  
  const content = renderHtmlContent(html);
  
  return React.createElement('div', {
    className: `${className} ${maxHeight} overflow-y-auto`,
    dangerouslySetInnerHTML: content
  });
};
