export default function ProductCard({
  image, name, price, description, isPrimary, category, onEdit
}: {
  image?: string;
  name: string;
  price: string;
  description: string;
  isPrimary?: boolean;
  category: string;
  onEdit?: () => void;
}) {
  return (
    <div className="border border-[#3B2B1E] rounded-2xl p-4 bg-[#21170F] relative flex flex-col group">
      {isPrimary && (
        <span className="absolute top-2 right-2 bg-[#E8B66F]/20 text-[#E8B66F] text-[10px] uppercase font-bold px-2 py-1 rounded">
          Flagship
        </span>
      )}
      {image ? (
        <img src={image} alt={name} className="w-full h-32 object-cover rounded-xl mb-3" />
      ) : (
        <div className="w-full h-32 bg-[#3B2B1E] rounded-xl mb-3 flex items-center justify-center">
          <span className="text-[#8A7B6D] text-xs">No image</span>
        </div>
      )}
      <h4 className="font-semibold text-white text-base truncate">{name}</h4>
      <p className="text-[#E8B66F] text-sm font-medium mb-1">{price}</p>
      <p className="text-[#B9AA99] text-xs line-clamp-2 mb-3 flex-1">{description}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[#8A7B6D] text-[10px] uppercase tracking-wider">{category}</span>
        {onEdit && (
          <button onClick={onEdit} className="text-[#E8B66F] text-xs hover:underline">
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
