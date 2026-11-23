// מחיל את ערכת הנושא לפני הציור הראשון כדי שלא יהבהב
try { var t = localStorage.getItem('alexianeNails.theme'); if (t === 'dark' || t === 'light') document.documentElement.dataset.theme = t; } catch (e) {}
